




# IMPORTS


import os
import io
import re
import json
import math
import hashlib
import time
import base64
import statistics
from pathlib import Path

from dotenv import load_dotenv

import fitz
import pdfplumber
import numpy as np
import cv2
import pytesseract
import imagehash

from PIL import Image, ImageDraw
from langdetect import detect

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_core.messages import SystemMessage, HumanMessage

from langchain_community.vectorstores import FAISS
from langchain_community.vectorstores.utils import DistanceStrategy
from langchain_community.retrievers import BM25Retriever
from langchain_groq import ChatGroq

from documind_rag.rag.query_rewriting import rewrite_query

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PACKAGE_ROOT / ".env")
load_dotenv(PACKAGE_ROOT / "rag" / ".env")

LOW_MEMORY_MODE = os.environ.get("DOCUMIND_LOW_MEMORY", "true").lower() == "true"

if LOW_MEMORY_MODE:
    torch = None
    open_clip = None
else:
    import torch
    import open_clip
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_community.cross_encoders import HuggingFaceCrossEncoder



# CONFIGURATION



try:
    from google.colab import userdata
    GROQ_API_KEY = userdata.get("GROQ_API_KEY")
except Exception:
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")


if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY not found. "
        "Add it to Google Colab Secrets or environment variables."
    )

os.environ["GROQ_API_KEY"] = GROQ_API_KEY



# Models

TEXT_MODEL = "openai/gpt-oss-120b"

VISION_MODEL = "qwen/qwen3.6-27b"

EMBED_MODEL_NAME = "BAAI/bge-m3"
RERANK_MODEL_NAME = "BAAI/bge-reranker-v2-m3"

CLIP_MODEL_NAME = "ViT-B-32"
CLIP_PRETRAINED = "laion2b_s34b_b79k"



# Retrieval


CHUNK_SIZE = 500
CHUNK_OVERLAP = 80

TOP_K_RETRIEVE = 15
TOP_K_FINAL = 5

MAX_CONTEXT_TOKENS = 6000
MAX_ANSWER_TOKENS = int(os.environ.get("DOCUMIND_MAX_ANSWER_TOKENS", "2500"))

CONFIDENCE_THRESHOLD = 0.30

BOOST_FACTOR = 1.25



# OCR


MIN_TEXT_LEN = 40
OCR_LANG = "ara+eng"

RENDER_ZOOM = 2.0



# Visual processing


REGION_MIN_AREA_RATIO = 0.03
REGION_MAX_COUNT = 6

MAX_VISUAL_CANDIDATES = 4
MAX_VISUAL_CHUNKS_TO_VLM = 3

VISUAL_DEDUP_HAMMING_THRESHOLD = 4



# Layout


HEADING_FONT_SIZE_RATIO = 1.2

SCAN_IMAGE_COVERAGE_THRESHOLD = 0.5



#  LOAD MODELS


class HashEmbeddings(Embeddings):
    """Small deterministic embeddings for memory-constrained deployments."""

    def __init__(self, dimension=384):
        self.dimension = dimension

    def _embed(self, text):
        vector = np.zeros(self.dimension, dtype="float32")
        tokens = re.findall(r"[\w\u0600-\u06FF]+", text.lower())
        for token in tokens:
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
            bucket = int.from_bytes(digest[:4], "big") % self.dimension
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[bucket] += sign
        norm = float(np.linalg.norm(vector))
        if norm < 1e-6:
            vector[0] = 1.0
            return vector.tolist()
        return (vector / norm).tolist()

    def embed_documents(self, texts):
        return [self._embed(text) for text in texts]

    def embed_query(self, text):
        return self._embed(text)


class LightweightReranker:
    """Token-overlap reranker compatible with the cross encoder interface."""

    def score(self, pairs):
        scores = []
        for query, content in pairs:
            query_tokens = _token_set(query)
            content_tokens = _token_set(content[:2000])
            if not query_tokens or not content_tokens:
                scores.append(0.0)
                continue
            overlap = len(query_tokens & content_tokens) / max(len(query_tokens), 1)
            scores.append((overlap * 8.0) - 4.0)
        return scores


print("Loading embedding model...")

if LOW_MEMORY_MODE:
    print("Low-memory mode enabled. Using lightweight hash embeddings.")
    hf_embeddings = HashEmbeddings()
else:
    hf_embeddings = HuggingFaceEmbeddings(
        model_name=EMBED_MODEL_NAME,
        encode_kwargs={
            "normalize_embeddings": True,
            "batch_size": 32,
        },
    )

print("Loading reranker...")

if LOW_MEMORY_MODE:
    cross_encoder = LightweightReranker()
else:
    cross_encoder = HuggingFaceCrossEncoder(
        model_name=RERANK_MODEL_NAME
    )


print("Loading CLIP...")

if LOW_MEMORY_MODE:
    clip_model = None
    clip_preprocess = None
    clip_tokenizer = None
else:
    clip_model, _, clip_preprocess = open_clip.create_model_and_transforms(
        CLIP_MODEL_NAME,
        pretrained=CLIP_PRETRAINED
    )

    clip_tokenizer = open_clip.get_tokenizer(CLIP_MODEL_NAME)

    clip_model.eval()


print("Models loaded.")



#  LLM FACTORIES


def _llm_text(
    temperature=0.1,
    max_tokens=None
):
    return ChatGroq(
        model=TEXT_MODEL,
        temperature=temperature,
        max_tokens=max_tokens or MAX_ANSWER_TOKENS,
    )


def _llm_vision(
    temperature=0.2,
    max_tokens=900
):
    return ChatGroq(
        model=VISION_MODEL,
        temperature=temperature,
        max_tokens=max_tokens,
    )



#  API INVOCATION WITH RETRY


_TRANSIENT_ERROR_MARKERS = (
    "503",
    "429",
    "over capacity",
    "rate limit",
    "rate_limit",
    "timeout",
    "internal_server_error",
)


def _invoke(
    llm,
    messages,
    max_retries=4,
    base_delay=1.5
):

    last_err = None

    for attempt in range(max_retries):

        try:
            return llm.invoke(messages)

        except Exception as e:

            last_err = e
            msg = str(e).lower()

            transient = any(
                marker.lower() in msg
                for marker in _TRANSIENT_ERROR_MARKERS
            )

            if not transient or attempt == max_retries - 1:
                raise

            delay = base_delay * (2 ** attempt)

            print(
                f"Transient API error. "
                f"Retrying in {delay:.1f}s..."
            )

            time.sleep(delay)

    raise last_err



#  IMAGE UTILITIES


def _prepare_image_for_vision(
    pil_image,
    max_side=1536
):

    if min(pil_image.size) < 8:
        return None

    img = pil_image.convert("RGB")

    if max(img.size) > max_side:

        ratio = max_side / max(img.size)

        img = img.resize(
            (
                max(1, int(img.width * ratio)),
                max(1, int(img.height * ratio)),
            )
        )

    return img


def pil_to_base64(img):

    buf = io.BytesIO()

    img.save(
        buf,
        format="PNG"
    )

    return base64.b64encode(
        buf.getvalue()
    ).decode("utf-8")



#  DOCUMENT REGISTRY


DOCUMENT_REGISTRY = {}


def _make_document_id(pdf_path):

    base = os.path.splitext(
        os.path.basename(pdf_path)
    )[0]

    doc_id = base
    i = 1

    while doc_id in DOCUMENT_REGISTRY:

        i += 1
        doc_id = f"{base}_{i}"

    return doc_id



#  FAST HEADING DETECTION


def _page_headings(page):

    d = page.get_text("dict")

    sizes = [
        span["size"]
        for block in d["blocks"]
        for line in block.get("lines", [])
        for span in line.get("spans", [])
        if span["text"].strip()
    ]

    if not sizes:
        return []

    median_size = statistics.median(sizes)

    headings = []

    for block in d["blocks"]:

        for line in block.get("lines", []):

            for span in line.get("spans", []):

                text = span["text"].strip()

                if (
                    text
                    and span["size"] >= median_size * HEADING_FONT_SIZE_RATIO
                    and len(text) < 120
                ):

                    headings.append(
                        (
                            block["bbox"][1],
                            text
                        )
                    )

    return sorted(
        headings,
        key=lambda x: x[0]
    )


def _section_for_y(headings, y):

    current = None

    for hy, text in headings:

        if hy <= y:
            current = text
        else:
            break

    return current



#  FAST PAGE ANALYSIS


def analyze_document(
    pdf_path,
    document_id
):

    doc = fitz.open(pdf_path)

    pages_meta = []

    for i in range(len(doc)):

        page = doc[i]

        page_area = (
            page.rect.width *
            page.rect.height
        )

        text = page.get_text("text").strip()

        images = page.get_images(full=True)

        has_text = len(text) >= MIN_TEXT_LEN

        has_images = len(images) > 0

        image_coverage = 0.0

        # Image coverage calculation
        # kept lightweight and only uses existing PDF image rects
        for xref in [im[0] for im in images]:

            rects = page.get_image_rects(xref)

            if rects:

                r = rects[0]

                image_coverage += (
                    r.width * r.height
                ) / page_area if page_area else 0

        text_density = (
            len(text) / page_area
            if page_area else 0
        )

        is_scanned = (
            (
                image_coverage >=
                SCAN_IMAGE_COVERAGE_THRESHOLD
            )
            and text_density < 0.001
        ) or (
            has_images and not has_text
        )

        if is_scanned:

            recommended_retriever = "vision"

        elif has_images:

            recommended_retriever = "hybrid_multimodal"

        else:

            recommended_retriever = "text"

        headings = _page_headings(page)

        pages_meta.append({

            "document_id": document_id,

            "page_number": i + 1,

            "text": text,

            "has_text": has_text,

            "has_images": has_images,

            "has_tables": False,

            "has_charts": False,

            "is_scanned": is_scanned,

            "ocr_required": is_scanned,

            "text_density": round(
                text_density,
                6
            ),

            "image_coverage": round(
                image_coverage,
                3
            ),

            "recommended_retriever":
                recommended_retriever,

            "image_xrefs":
                [img[0] for img in images],

            "headings":
                headings,

        })

    doc.close()

    scanned_ratio = (
        sum(
            p["is_scanned"]
            for p in pages_meta
        )
        /
        len(pages_meta)
        if pages_meta else 0
    )

    document_type = (

        "scanned"
        if scanned_ratio > 0.5

        else "mixed"
        if any(
            p["has_images"]
            for p in pages_meta
        )

        else "text-heavy"
    )

    print(
        f"[{document_id}] "
        f"type: {document_type} | "
        f"{len(pages_meta)} pages analyzed"
    )

    return pages_meta, document_type



#  PAGE RENDER


def render_page_image(
    pdf_path,
    page_number,
    zoom=RENDER_ZOOM
):

    doc = fitz.open(pdf_path)

    pix = doc[
        page_number - 1
    ].get_pixmap(
        matrix=fitz.Matrix(
            zoom,
            zoom
        )
    )

    img = Image.open(
        io.BytesIO(
            pix.tobytes("png")
        )
    ).convert("RGB")

    doc.close()

    return img



#  OCR


def ocr_page_with_boxes(
    pdf_path,
    page_number,
    zoom=RENDER_ZOOM
):

    img = render_page_image(
        pdf_path,
        page_number,
        zoom
    )

    data = pytesseract.image_to_data(
        img,
        lang=OCR_LANG,
        output_type=pytesseract.Output.DICT
    )

    words = []
    confs = []
    lines = []

    for i in range(len(data["text"])):

        text = data["text"][i].strip()

        raw_conf = data["conf"][i]

        try:
            conf = float(raw_conf)
        except:
            conf = -1

        if text and conf >= 0:

            words.append({

                "text": text,

                "conf": conf,

                "bbox": (
                    data["left"][i] / zoom,
                    data["top"][i] / zoom,
                    (
                        data["left"][i]
                        + data["width"][i]
                    ) / zoom,
                    (
                        data["top"][i]
                        + data["height"][i]
                    ) / zoom,
                ),

            })

            confs.append(conf)

            lines.append(text)

    full_text = " ".join(lines).strip()

    avg_conf = (
        round(
            sum(confs) /
            len(confs),
            1
        )
        if confs else 0.0
    )

    return (
        full_text,
        avg_conf,
        words
    )



#  TEXT CHUNKING


def chunk_text(
    text,
    size=CHUNK_SIZE,
    overlap=CHUNK_OVERLAP
):

    words = text.split()

    chunks = []

    start = 0

    step = max(
        1,
        size - overlap
    )

    while start < len(words):

        chunk = " ".join(
            words[
                start:
                start + size
            ]
        )

        if chunk.strip():
            chunks.append(chunk)

        start += step

    return chunks



#  APPROXIMATE TEXT POSITION


def _approx_chunk_y(
    page_text_blocks,
    chunk_text_str,
    fallback=0
):

    probe = " ".join(
        chunk_text_str.split()[:6]
    )[:30]

    if not probe:
        return fallback

    for b in page_text_blocks:

        block_text = b[4]

        if probe in block_text:
            return b[1]

    return fallback


#  SURROUNDING TEXT

def get_surrounding_text(
    page,
    bbox,
    margin=60
):

    if not bbox:
        return "", ""

    x0, y0, x1, y1 = bbox

    blocks = page.get_text(
        "blocks"
    )

    above = []
    below = []

    for b in blocks:

        bx0, by0, bx1, by1, text, *_ = b

        if not text.strip():
            continue

        if (
            by1 <= y0
            and
            (y0 - by1) <= margin
        ):

            above.append(
                (
                    by1,
                    text.strip()
                )
            )

        elif (
            by0 >= y1
            and
            (by0 - y1) <= margin
        ):

            below.append(
                (
                    by0,
                    text.strip()
                )
            )

    above_text = " ".join(
        t
        for _, t in sorted(
            above,
            key=lambda x: -x[0]
        )[:1]
    )

    below_text = " ".join(
        t
        for _, t in sorted(
            below,
            key=lambda x: x[0]
        )[:1]
    )

    return (
        above_text,
        below_text
    )


#  IMAGE BBOX

def get_image_bbox(
    page,
    xref
):

    rects = page.get_image_rects(
        xref
    )

    if rects:

        r = rects[0]

        return (
            round(r.x0, 1),
            round(r.y0, 1),
            round(r.x1, 1),
            round(r.y1, 1),
        )

    return None


#  FAST TABLE EXTRACTION

def extract_tables_for_document(
    pdf_path
):

    table_map = {}

    try:

        with pdfplumber.open(
            pdf_path
        ) as pl:

            for page_number, page in enumerate(
                pl.pages,
                start=1
            ):

                try:
                    tables = page.find_tables()
                except Exception:
                    tables = []

                if tables:
                    table_map[
                        page_number
                    ] = tables

    except Exception as e:

        print(
            f"Table extraction warning: {e}"
        )

    return table_map



# 17) BUILD FAST KNOWLEDGE BASE

# IMPORTANT:
# NO VLM CALLS HERE

def build_knowledge_base(
    pdf_paths
):

    if isinstance(
        pdf_paths,
        str
    ):
        pdf_paths = [pdf_paths]

    kb = []

    cid = 0

    documents_meta = {}

    for pdf_path in pdf_paths:

        document_id = _make_document_id(
            pdf_path
        )

        print(
            f"\nProcessing: "
            f"{os.path.basename(pdf_path)}"
        )

        pages_meta, document_type = analyze_document(
            pdf_path,
            document_id
        )


        # Language


        try:

            sample_text = " ".join(
                p["text"]
                for p in pages_meta[:3]
                if p["text"]
            )[:1000]

            sample_lang = (
                detect(sample_text)
                if sample_text
                else "unknown"
            )

        except Exception:

            sample_lang = "unknown"

        DOCUMENT_REGISTRY[
            document_id
        ] = {

            "path": pdf_path,

            "filename":
                os.path.basename(pdf_path),

            "page_count":
                len(pages_meta),

            "document_type":
                document_type,

            "language":
                sample_lang,

        }

        documents_meta[
            document_id
        ] = DOCUMENT_REGISTRY[
            document_id
        ]


        # TABLE EXTRACTION


        table_map = extract_tables_for_document(
            pdf_path
        )

        doc = fitz.open(
            pdf_path
        )


        # PROCESS PAGES


        for p in pages_meta:

            page_number = p[
                "page_number"
            ]

            page = doc[
                page_number - 1
            ]

            headings = p[
                "headings"
            ]


            # SCANNED PAGE


            if p["is_scanned"]:

                print(
                    f"[{document_id}] "
                    f"page {page_number}: "
                    f"scanned -> OCR only"
                )

                try:

                    ocr_text, ocr_conf, ocr_words = (
                        ocr_page_with_boxes(
                            pdf_path,
                            page_number
                        )
                    )

                except Exception as e:

                    print(
                        f"OCR failed on page "
                        f"{page_number}: {e}"
                    )

                    ocr_text = ""
                    ocr_conf = 0
                    ocr_words = []

                if ocr_text:

                    kb.append({

                        "chunk_id": cid,

                        "document_id":
                            document_id,

                        "page_number":
                            page_number,

                        "type":
                            "text_ocr",

                        "content":
                            ocr_text,

                        "bbox":
                            None,

                        "chunk_index":
                            0,

                        "source":
                            "tesseract_ocr",

                        "element_id":
                            f"{document_id}_p{page_number}_ocr",

                        "region_id":
                            None,

                        "section":
                            _section_for_y(
                                headings,
                                0
                            ),

                        "ocr_confidence":
                            ocr_conf,

                        "ocr_word_count":
                            len(ocr_words),

                    })

                    cid += 1


            # DIGITAL TEXT PAGE


            elif p["has_text"]:

                page_text_blocks = page.get_text(
                    "blocks"
                )

                chunks = chunk_text(
                    p["text"]
                )

                for chunk_idx, c in enumerate(
                    chunks
                ):

                    approx_y = _approx_chunk_y(
                        page_text_blocks,
                        c,
                        fallback=0
                    )

                    kb.append({

                        "chunk_id": cid,

                        "document_id":
                            document_id,

                        "page_number":
                            page_number,

                        "type":
                            "text",

                        "content":
                            c,

                        "bbox":
                            None,

                        "chunk_index":
                            chunk_idx,

                        "source":
                            "pdf_text",

                        "element_id":
                            f"{document_id}_p{page_number}_t{chunk_idx}",

                        "region_id":
                            None,

                        "section":
                            _section_for_y(
                                headings,
                                approx_y
                            ),

                    })

                    cid += 1


            # VISUAL CATALOG

            # NO VLM
            #
            # We only register visual elements.


            page_visual_hashes = []

            for img_idx, xref in enumerate(
                p["image_xrefs"]
            ):

                try:

                    base_image = doc.extract_image(
                        xref
                    )

                    raw_bytes = base_image[
                        "image"
                    ]

                    img = Image.open(
                        io.BytesIO(raw_bytes)
                    ).convert("RGB")

                    if min(img.size) < 32:
                        continue

                    img_hash = imagehash.phash(
                        img
                    )

                    if any(
                        (
                            img_hash - h
                        )
                        <= VISUAL_DEDUP_HAMMING_THRESHOLD
                        for h in page_visual_hashes
                    ):

                        continue

                    page_visual_hashes.append(
                        img_hash
                    )

                    bbox = get_image_bbox(
                        page,
                        xref
                    )

                    caption_above, caption_below = (
                        get_surrounding_text(
                            page,
                            bbox
                        )
                    )


                    # IMPORTANT:
                    # We do NOT call VLM here


                    visual_description = (
                        f"Visual element on page "
                        f"{page_number}."
                    )

                    if caption_above:

                        visual_description += (
                            f" Context above: "
                            f"{caption_above}"
                        )

                    if caption_below:

                        visual_description += (
                            f" Context below: "
                            f"{caption_below}"
                        )

                    kb.append({

                        "chunk_id": cid,

                        "document_id":
                            document_id,

                        "page_number":
                            page_number,

                        "type":
                            "image",

                        "content":
                            visual_description,

                        "bbox":
                            bbox,

                        "chunk_index":
                            img_idx,

                        "source":
                            "visual_catalog",

                        "element_id":
                            f"{document_id}_p{page_number}_img{img_idx}",

                        "region_id":
                            None,

                        "section":
                            _section_for_y(
                                headings,
                                bbox[1]
                                if bbox
                                else 0
                            ),

                        "caption_above":
                            caption_above,

                        "caption_below":
                            caption_below,

                        "width":
                            img.width,

                        "height":
                            img.height,

                        "aspect_ratio":
                            round(
                                img.width /
                                img.height,
                                3
                            )
                            if img.height
                            else None,

                        "phash":
                            str(img_hash),

                    })

                    cid += 1

                except Exception as e:

                    print(
                        f"Visual catalog "
                        f"warning on page "
                        f"{page_number}: {e}"
                    )


            # TABLES


            tables = table_map.get(
                page_number,
                []
            )

            if tables:

                p["has_tables"] = True

            for t_idx, table in enumerate(
                tables
            ):

                try:

                    rows = table.extract()

                except Exception:

                    continue

                if not rows or len(rows) <= 1:
                    continue

                headers = [
                    str(c)
                    if c is not None
                    else ""
                    for c in rows[0]
                ]

                data_rows = [
                    [
                        str(c)
                        if c is not None
                        else ""
                        for c in row
                    ]
                    for row in rows[1:]
                ]

                md_rows = [

                    "| "
                    + " | ".join(headers)
                    + " |",

                    "| "
                    + " | ".join(
                        ["---"] *
                        len(headers)
                    )
                    + " |",

                ]

                md_rows += [

                    "| "
                    + " | ".join(row)
                    + " |"

                    for row in data_rows
                ]

                bbox = tuple(
                    round(v, 1)
                    for v in table.bbox
                )

                caption_above, caption_below = (
                    get_surrounding_text(
                        page,
                        bbox
                    )
                )

                title = (
                    caption_above
                    or
                    f"Table {t_idx + 1} "
                    f"on page {page_number}"
                )

                kb.append({

                    "chunk_id": cid,

                    "document_id":
                        document_id,

                    "page_number":
                        page_number,

                    "type":
                        "table",

                    "content":
                        "\n".join(md_rows),

                    "bbox":
                        bbox,

                    "chunk_index":
                        t_idx,

                    "source":
                        "pdfplumber_table_extraction",

                    "element_id":
                        f"{document_id}_p{page_number}_table{t_idx}",

                    "region_id":
                        None,

                    "section":
                        _section_for_y(
                            headings,
                            bbox[1]
                        ),

                    "table_id":
                        f"table_{t_idx}",

                    "title":
                        title,

                    "headers":
                        headers,

                    "rows":
                        data_rows,

                    "caption_above":
                        caption_above,

                    "caption_below":
                        caption_below,

                })

                cid += 1

        doc.close()

    print(
        f"\nKnowledge base built: "
        f"{len(kb)} chunks across "
        f"{len(DOCUMENT_REGISTRY)} document(s)"
    )

    return (
        kb,
        documents_meta
    )


#  LANGCHAIN DOCUMENT CONVERSION


def chunks_to_documents(kb):

    docs = []

    for c in kb:

        metadata = {
            k: v
            for k, v in c.items()
            if k != "content"
        }

        docs.append(
            Document(
                page_content=c["content"],
                metadata=metadata
            )
        )

    return docs


def document_to_chunk(doc):

    chunk = dict(
        doc.metadata
    )

    chunk["content"] = (
        doc.page_content
    )

    return chunk



# 19) TEXT INDEXES


def build_indexes(kb):

    print(
        "\nBuilding text indexes..."
    )

    docs = chunks_to_documents(
        kb
    )

    kb_by_id = {
        c["chunk_id"]: c
        for c in kb
    }


    # Dense BGE-M3


    faiss_store = FAISS.from_documents(

        docs,

        hf_embeddings,

        distance_strategy=
            DistanceStrategy.MAX_INNER_PRODUCT,

        normalize_L2=True,

    )


    # BM25


    bm25_retriever = (
        BM25Retriever.from_documents(
            docs
        )
    )

    bm25_retriever.k = (
        TOP_K_RETRIEVE
    )


    # Table sub-index


    table_docs = [
        d
        for d in docs
        if d.metadata["type"] == "table"
    ]

    table_store = None

    if table_docs:

        table_store = FAISS.from_documents(

            table_docs,

            hf_embeddings,

            distance_strategy=
                DistanceStrategy.MAX_INNER_PRODUCT,

            normalize_L2=True,

        )

    print(
        f"Text index ready. "
        f"{len(docs)} documents."
    )

    return (
        faiss_store,
        bm25_retriever,
        table_store,
        kb_by_id
    )



#  CLIP


def embed_image_clip(
    pil_image
):
    if LOW_MEMORY_MODE:
        raise RuntimeError("CLIP image embeddings are disabled in low-memory mode.")

    img = clip_preprocess(
        pil_image
    ).unsqueeze(0)

    with torch.no_grad():

        feat = clip_model.encode_image(
            img
        )

        feat /= feat.norm(
            dim=-1,
            keepdim=True
        )

    return feat.cpu().numpy().astype(
        "float32"
    )[0]


def embed_text_clip(
    text
):
    if LOW_MEMORY_MODE:
        return hf_embeddings.embed_query(text)

    tokens = clip_tokenizer(
        [text[:300]]
    )

    with torch.no_grad():

        feat = clip_model.encode_text(
            tokens
        )

        feat /= feat.norm(
            dim=-1,
            keepdim=True
        )

    return feat.cpu().numpy().astype(
        "float32"
    )[0]


class ClipQueryEmbeddings(
    Embeddings
):

    def embed_documents(
        self,
        texts
    ):

        return [
            embed_text_clip(
                t
            ).tolist()
            for t in texts
        ]

    def embed_query(
        self,
        text
    ):

        return embed_text_clip(
            text
        ).tolist()



#  BUILD VISUAL INDEX
#
# IMPORTANT:
# Still no VLM
#
# CLIP is local and much cheaper than VLM


def build_visual_index(kb):
    if LOW_MEMORY_MODE:
        print("Skipping visual index in low-memory mode.")
        return None

    print(
        "\nBuilding lightweight visual index..."
    )

    open_docs = {}

    embeddings = []

    metadatas = []

    visual_count = 0

    for c in kb:

        if c["type"] != "image":
            continue

        try:

            doc_path = DOCUMENT_REGISTRY[
                c["document_id"]
            ]["path"]

            if doc_path not in open_docs:

                open_docs[doc_path] = fitz.open(
                    doc_path
                )

            doc = open_docs[
                doc_path
            ]

            page = doc[
                c["page_number"] - 1
            ]

            if c.get("bbox"):

                pix = page.get_pixmap(
                    clip=fitz.Rect(
                        c["bbox"]
                    ),
                    matrix=fitz.Matrix(
                        1.5,
                        1.5
                    )
                )

            else:

                pix = page.get_pixmap(
                    matrix=fitz.Matrix(
                        1.5,
                        1.5
                    )
                )

            img = Image.open(
                io.BytesIO(
                    pix.tobytes("png")
                )
            ).convert("RGB")

            vec = embed_image_clip(
                img
            )

            embeddings.append(
                (
                    c["content"],
                    vec.tolist()
                )
            )

            metadatas.append({
                k: v
                for k, v in c.items()
                if k != "content"
            })

            visual_count += 1

        except Exception as e:

            print(
                f"CLIP visual indexing "
                f"warning: {e}"
            )

    for doc in open_docs.values():
        doc.close()

    if not embeddings:

        print(
            "No embedded visual elements."
        )

        return None

    visual_store = FAISS.from_embeddings(

        embeddings,

        ClipQueryEmbeddings(),

        metadatas=metadatas,

        distance_strategy=
            DistanceStrategy.MAX_INNER_PRODUCT,

        normalize_L2=True,

    )

    print(
        f"Visual index ready: "
        f"{visual_count} visual elements."
    )

    return visual_store


# 22) LAZY SCANNED-PAGE REGION SEGMENTATION

# This is intentionally NOT executed during ingestion

def segment_page_regions(
    pil_image
):

    gray = cv2.cvtColor(
        np.array(pil_image),
        cv2.COLOR_RGB2GRAY
    )

    _, thresh = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY_INV
        + cv2.THRESH_OTSU
    )

    kernel = np.ones(
        (15, 15),
        np.uint8
    )

    dilated = cv2.dilate(
        thresh,
        kernel,
        iterations=2
    )

    contours, _ = cv2.findContours(
        dilated,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    page_area = (
        pil_image.width *
        pil_image.height
    )

    boxes = []

    for c in contours:

        x, y, w, h = cv2.boundingRect(
            c
        )

        if (
            w * h
        ) / page_area >= REGION_MIN_AREA_RATIO:

            boxes.append(
                (
                    x,
                    y,
                    x + w,
                    y + h
                )
            )

    boxes = sorted(
        boxes,
        key=lambda b: (
            b[1],
            b[0]
        )
    )

    boxes = boxes[
        :REGION_MAX_COUNT
    ]

    return (
        boxes
        if len(boxes) > 1
        else []
    )


#  LAZY VISUAL REGION DISCOVERY

def discover_visual_regions(
    chunk
):

    doc_path = DOCUMENT_REGISTRY[
        chunk["document_id"]
    ]["path"]

    page_number = chunk[
        "page_number"
    ]

    page_img = render_page_image(
        doc_path,
        page_number,
        zoom=RENDER_ZOOM
    )

    regions = segment_page_regions(
        page_img
    )

    if not regions:

        regions = [
            (
                0,
                0,
                page_img.width,
                page_img.height
            )
        ]

    outputs = []

    for idx, box in enumerate(
        regions
    ):

        x0, y0, x1, y1 = box

        region_img = page_img.crop(
            box
        )

        safe_img = (
            _prepare_image_for_vision(
                region_img
            )
        )

        if safe_img is None:
            continue

        pdf_bbox = (

            round(
                x0 / RENDER_ZOOM,
                1
            ),

            round(
                y0 / RENDER_ZOOM,
                1
            ),

            round(
                x1 / RENDER_ZOOM,
                1
            ),

            round(
                y1 / RENDER_ZOOM,
                1
            ),

        )

        outputs.append({

            "chunk_id":
                f"{chunk['chunk_id']}_region_{idx}",

            "document_id":
                chunk["document_id"],

            "page_number":
                page_number,

            "type":
                "visual_region",

            "content":
                "Visual region requiring VLM analysis.",

            "bbox":
                pdf_bbox,

            "region_id":
                f"region_{idx}",

            "element_id":
                f"{chunk['document_id']}_p{page_number}_region{idx}",

            "_image":
                safe_img,

        })

    return outputs


#  VISUAL VLM ANALYSIS

# NOW this is called only at query time

def classify_and_describe_image(
    pil_image
):

    safe_img = (
        _prepare_image_for_vision(
            pil_image
        )
    )

    if safe_img is None:
        return (
            "image",
            "",
            None
        )

    prompt = """
Analyze this visual element.

Respond in EXACTLY this format:

TYPE: <chart|diagram|image|table>

DESCRIPTION:
<detailed useful description including visible text,
numbers, labels, axes, legends, relationships,
trends, objects, or important visual information>

STRUCTURE:
<JSON if chart/table/diagram, otherwise null>

For charts, use:
{
  "title": "...",
  "x_axis": "...",
  "y_axis": "...",
  "legend": [],
  "series": []
}

For tables, use:
{
  "title": "...",
  "headers": [],
  "rows": []
}

For diagrams, use:
{
  "nodes": [],
  "relationships": []
}
"""

    b64 = pil_to_base64(
        safe_img
    )

    message = HumanMessage(
        content=[

            {
                "type": "text",
                "text": prompt
            },

            {
                "type": "image_url",
                "image_url": {
                    "url":
                        f"data:image/png;base64,{b64}"
                }
            },

        ]
    )

    response = _invoke(
        _llm_vision(
            temperature=0.1,
            max_tokens=900
        ),
        [message]
    )

    content = response.content

    type_match = re.search(
        r"TYPE:\s*"
        r"(chart|diagram|image|table)",
        content,
        re.IGNORECASE
    )

    desc_match = re.search(
        r"DESCRIPTION:\s*"
        r"(.*?)(?:\nSTRUCTURE:|\Z)",
        content,
        re.IGNORECASE | re.DOTALL
    )

    struct_match = re.search(
        r"STRUCTURE:\s*"
        r"(\{.*\}|null)",
        content,
        re.IGNORECASE | re.DOTALL
    )

    element_type = (
        type_match.group(1).lower()
        if type_match
        else "image"
    )

    description = (
        desc_match.group(1).strip()
        if desc_match
        else content
    )

    chart_structure = None

    if struct_match:

        raw = struct_match.group(1).strip()

        if raw.lower() != "null":

            try:

                chart_structure = json.loads(
                    raw
                )

            except Exception:

                chart_structure = None

    return (
        element_type,
        description,
        chart_structure
    )


#  QUERY TYPE CONFIG

QUERY_TYPE_CONFIG = {

    "factual_text": {

        "boost_types":
            ["text", "text_ocr"],

        "top_k":
            TOP_K_RETRIEVE,

        "weights": {
            "dense": 0.55,
            "bm25": 0.35,
            "visual": 0.10,
        },

    },

    "exact_lookup": {

        "boost_types":
            ["text", "text_ocr", "table"],

        "top_k":
            TOP_K_RETRIEVE,

        "weights": {
            "dense": 0.50,
            "bm25": 0.40,
            "visual": 0.10,
        },

    },

    "table_question": {

        "boost_types":
            ["table"],

        "top_k":
            TOP_K_RETRIEVE,

        "weights": {
            "dense": 0.40,
            "bm25": 0.30,
            "visual": 0.10,
            "table_index": 0.20,
        },

    },

    "chart_question": {

        "boost_types":
            ["image", "chart", "diagram"],

        "top_k":
            TOP_K_RETRIEVE,

        "weights": {
            "dense": 0.20,
            "bm25": 0.10,
            "visual": 0.70,
        },

    },

    "image_question": {

        "boost_types":
            ["image", "chart", "diagram"],

        "top_k":
            TOP_K_RETRIEVE,

        "weights": {
            "dense": 0.15,
            "bm25": 0.10,
            "visual": 0.75,
        },

    },

    "summarization": {

        "boost_types": [],

        "top_k":
            TOP_K_RETRIEVE * 2,

        "weights": {
            "dense": 0.40,
            "bm25": 0.30,
            "visual": 0.30,
        },

    },

    "cross_page": {

        "boost_types": [],

        "top_k":
            TOP_K_RETRIEVE * 2,

        "weights": {
            "dense": 0.40,
            "bm25": 0.30,
            "visual": 0.30,
        },

    },

}


#  QUERY ANALYZER

def analyze_query(
    query
):

    prompt = (
        "Classify the user question into exactly "
        "one label from this list:\n"
        "factual_text, exact_lookup, table_question, "
        "chart_question, image_question, summarization, "
        "cross_page.\n\n"
        "Respond with ONLY the label.\n\n"
        f"Question: {query}"
    )

    response = _invoke(

        _llm_text(
            temperature=0,
            max_tokens=10
        ),

        [
            HumanMessage(
                content=prompt
            )
        ]

    )

    label = (
        response.content
        .strip()
        .lower()
    )

    return (
        label
        if label in QUERY_TYPE_CONFIG
        else "factual_text"
    )


#  QUERY FILTERS

def extract_query_filters(
    query
):

    filters = {
        "page": None,
        "type_hint": None,
    }

    m = re.search(
        r"(?:page|صفحة|الصفحة)"
        r"\s*#?\s*(\d+)",
        query,
        re.IGNORECASE
    )

    if m:

        filters["page"] = int(
            m.group(1)
        )

    if re.search(
        r"\b(figure|chart|diagram)\b"
        r"|شكل|رسم",
        query,
        re.IGNORECASE
    ):

        filters["type_hint"] = [
            "image",
            "chart",
            "diagram",
        ]

    elif re.search(
        r"\btable\b|جدول",
        query,
        re.IGNORECASE
    ):

        filters["type_hint"] = [
            "table"
        ]

    return filters


#  NORMALIZATION

def _minmax_norm(
    scores
):

    s = np.array(
        scores,
        dtype="float32"
    )

    if (
        s.size == 0
        or
        s.max() - s.min() < 1e-6
    ):

        return np.zeros_like(s)

    return (
        s - s.min()
    ) / (
        s.max() - s.min()
    )


# ============================================================
# 29) DENSE + BM25
# ============================================================

def dense_bm25_scores(
    query,
    faiss_store,
    bm25_retriever,
    top_k
):

    dense_hits = (
        faiss_store
        .similarity_search_with_score(
            query,
            k=top_k
        )
    )

    dense_ids = [
        d.metadata["chunk_id"]
        for d, _
        in dense_hits
    ]

    dense_raw = [
        float(s)
        for _, s
        in dense_hits
    ]

    dense_norm = dict(
        zip(
            dense_ids,
            _minmax_norm(
                dense_raw
            ).tolist()
        )
    )

    tokenized_query = (
        bm25_retriever
        .preprocess_func(query)
    )

    bm25_raw_all = (
        bm25_retriever
        .vectorizer
        .get_scores(
            tokenized_query
        )
    )

    order = np.argsort(
        bm25_raw_all
    )[::-1][:top_k]

    bm25_ids = [
        bm25_retriever
        .docs[i]
        .metadata["chunk_id"]
        for i in order
    ]

    bm25_norm = dict(
        zip(
            bm25_ids,
            _minmax_norm(
                bm25_raw_all[order]
            ).tolist()
        )
    )

    return (
        dense_norm,
        bm25_norm
    )


# ============================================================
# 30) VISUAL SCORES
# ============================================================

def visual_scores_for_query(
    query,
    visual_store,
    top_k=8
):

    if visual_store is None:
        return {}

    hits = (
        visual_store
        .similarity_search_with_score(
            query,
            k=top_k
        )
    )

    scores = [
        max(
            float(s),
            0.0
        )
        for _, s in hits
    ]

    max_score = (
        max(scores)
        if scores
        else 0.0
    )

    output = {}

    for (d, _), score in zip(
        hits,
        scores
    ):

        normalized = (
            score / max_score
            if max_score > 1e-6
            else 0
        )

        cid = d.metadata[
            "chunk_id"
        ]

        output[cid] = max(
            output.get(cid, 0),
            normalized
        )

    return output


# ============================================================
# 31) TABLE SCORES
# ============================================================

def table_index_scores(
    query,
    table_store,
    top_k=8
):

    if table_store is None:
        return {}

    hits = (
        table_store
        .similarity_search_with_score(
            query,
            k=top_k
        )
    )

    raw = [
        float(s)
        for _, s in hits
    ]

    norm = _minmax_norm(
        raw
    )

    return {
        d.metadata["chunk_id"]:
            float(n)

        for (d, _), n
        in zip(
            hits,
            norm
        )
    }


# ============================================================
# 32) DEDUPLICATION
# ============================================================

def _token_set(
    text
):

    return set(
        re.findall(
            r"\w+",
            text.lower()
        )
    )


def deduplicate_chunks(
    chunks
):

    ordered = sorted(
        chunks,
        key=lambda c:
            c.get(
                "retrieval_score",
                0
            ),
        reverse=True
    )

    kept = []

    kept_tokens = []

    for c in ordered:

        toks = _token_set(
            c["content"][:1000]
        )

        duplicate = False

        for kt in kept_tokens:

            union = (
                toks | kt
            )

            if (
                union
                and
                len(toks & kt)
                /
                len(union)
                >= 0.85
            ):

                duplicate = True
                break

        if not duplicate:

            kept.append(c)

            kept_tokens.append(
                toks
            )

    return kept


# ============================================================
# 33) MULTIMODAL RETRIEVAL
# ============================================================

def multimodal_retrieve(
    query,
    kb_by_id,
    faiss_store,
    bm25_retriever,
    visual_store,
    query_type,
    top_k,
    table_store=None,
    document_ids=None,
    query_filters=None,
):

    config = QUERY_TYPE_CONFIG[
        query_type
    ]

    weights = config[
        "weights"
    ]

    boost_types = config[
        "boost_types"
    ]

    dense_norm, bm25_norm = (
        dense_bm25_scores(
            query,
            faiss_store,
            bm25_retriever,
            top_k
        )
    )

    # Visual search only when useful.
    if query_type in (
        "chart_question",
        "image_question",
        "table_question"
    ):

        visual_norm = (
            visual_scores_for_query(
                query,
                visual_store,
                top_k=max(
                    8,
                    top_k
                )
            )
        )

    else:

        visual_norm = {}

    if "table_index" in weights:

        table_norm = (
            table_index_scores(
                query,
                table_store,
                top_k=8
            )
        )

    else:

        table_norm = {}

    candidate_ids = (
        set(dense_norm)
        |
        set(bm25_norm)
        |
        set(visual_norm)
        |
        set(table_norm)
    )

    if document_ids:

        candidate_ids = {

            cid

            for cid in candidate_ids

            if kb_by_id[cid][
                "document_id"
            ]
            in document_ids

        }

    if query_filters:

        filtered = candidate_ids

        if query_filters.get(
            "page"
        ) is not None:

            f2 = {

                cid

                for cid in filtered

                if kb_by_id[cid][
                    "page_number"
                ]
                ==
                query_filters["page"]

            }

            if f2:
                filtered = f2

        if query_filters.get(
            "type_hint"
        ):

            f2 = {

                cid

                for cid in filtered

                if kb_by_id[cid][
                    "type"
                ]
                in query_filters[
                    "type_hint"
                ]

            }

            if f2:
                filtered = f2

        candidate_ids = filtered

    fused = {}

    for cid in candidate_ids:

        score = (

            weights.get(
                "dense",
                0
            )
            *
            dense_norm.get(
                cid,
                0
            )

            +

            weights.get(
                "bm25",
                0
            )
            *
            bm25_norm.get(
                cid,
                0
            )

            +

            weights.get(
                "visual",
                0
            )
            *
            visual_norm.get(
                cid,
                0
            )

            +

            weights.get(
                "table_index",
                0
            )
            *
            table_norm.get(
                cid,
                0
            )

        )

        if (
            kb_by_id[cid]["type"]
            in boost_types
        ):

            score *= BOOST_FACTOR

        fused[cid] = score

    ranked = sorted(
        fused.items(),
        key=lambda x: x[1],
        reverse=True
    )[:top_k]

    results = []

    for cid, score in ranked:

        chunk = dict(
            kb_by_id[cid]
        )

        chunk[
            "retrieval_score"
        ] = min(
            float(score),
            1.0
        )

        chunk[
            "visual_score"
        ] = visual_norm.get(
            cid,
            0
        )

        results.append(
            chunk
        )

    return deduplicate_chunks(
        results
    )


# ============================================================
# 34) RERANKING
# ============================================================

def rerank(
    query,
    candidates,
    top_k=TOP_K_FINAL
):

    if not candidates:
        return [], []

    pairs = [
        [
            query,
            c["content"]
        ]
        for c in candidates
    ]

    raw_scores = (
        cross_encoder.score(
            pairs
        )
    )

    probs = [
        1 /
        (
            1 +
            math.exp(-float(s))
        )
        for s in raw_scores
    ]

    ranked = sorted(
        zip(
            candidates,
            probs
        ),
        key=lambda x: x[1],
        reverse=True
    )[:top_k]

    return (
        [c for c, _ in ranked],
        [s for _, s in ranked]
    )


# ============================================================
# 35) CONFIDENCE
# ============================================================

def compute_confidence(
    chunk,
    rerank_prob
):

    retrieval_score = min(
        chunk.get(
            "retrieval_score",
            0
        ),
        1.0
    )

    visual_score = chunk.get(
        "visual_score",
        0
    )

    if visual_score > 0.05:

        return (

            0.50 *
            rerank_prob

            +

            0.25 *
            retrieval_score

            +

            0.25 *
            visual_score

        )

    return (

        0.65 *
        rerank_prob

        +

        0.35 *
        retrieval_score

    )


def compute_answer_confidence(
    top_chunks,
    rerank_probs
):

    if not top_chunks:
        return 0.0

    scores = [

        compute_confidence(
            c,
            p
        )

        for c, p
        in zip(
            top_chunks,
            rerank_probs
        )

    ]

    top1 = scores[0]

    coverage = (
        sum(
            1
            for s in scores
            if s >= 0.4
        )
        /
        len(scores)
    )

    channels_active = sum(
        1
        for key in (
            "retrieval_score",
            "visual_score"
        )
        if top_chunks[0].get(
            key,
            0
        ) > 0.05
    )

    agreement_bonus = (
        0.05 *
        channels_active
    )

    return min(
        1.0,
        0.65 * top1
        +
        0.25 * coverage
        +
        agreement_bonus
    )


# ============================================================
# 36) CONTEXT BUDGET
# ============================================================

def _estimate_tokens(
    text
):

    return max(
        1,
        len(text) // 4
    )


def build_token_budget_context(
    chunks,
    max_tokens=MAX_CONTEXT_TOKENS
):

    used = 0

    kept = []

    for c in sorted(
        chunks,
        key=lambda c:
            c.get(
                "retrieval_score",
                0
            ),
        reverse=True
    ):

        t = _estimate_tokens(
            c["content"]
        )

        if (
            used + t > max_tokens
            and kept
        ):
            continue

        kept.append(c)

        used += t

        if used >= max_tokens:
            break

    return kept


# ============================================================
# 37) CONTEXT FORMAT
# ============================================================

def build_context(
    chunks
):

    tags = {

        "text":
            "text",

        "text_ocr":
            "OCR text",

        "table":
            "table",

        "image":
            "visual element",

        "chart":
            "chart",

        "diagram":
            "diagram",

    }

    return "\n\n---\n\n".join(

        f"[Doc {c['document_id']} "
        f"- Page {c['page_number']} "
        f"- {tags.get(c['type'], c['type'])}]\n"
        f"{c['content']}"

        for c in chunks

    )


# ============================================================
# 38) LANGUAGE
# ============================================================

def detect_language(
    text
):

    try:

        return (
            "ar"
            if detect(text) == "ar"
            else "en"
        )

    except Exception:

        return "en"


def _generate_query_rewrite_text(
    prompt
):

    response = _invoke(
        _llm_text(
            temperature=0,
            max_tokens=400
        ),
        [
            HumanMessage(
                content=prompt
            )
        ]
    )

    return response.content


# ============================================================
# 39) SYSTEM PROMPT
# ============================================================

CITATION_RULES = """

- Use only information present in the supplied context and images.
- Never invent information.
- Every factual claim from the document must have an inline
  page citation in the format (Page X).
- If visual evidence is used, the page citation must correspond
  to the visual evidence page.
"""


def _system_prompt(
    lang
):

    if lang == "ar":

        lang_instruction = (
            "أجب باللغة العربية فقط."
        )

        refuse_msg = (
            "المصدر المرفوع لا يحتوي على معلومات كافية لدعم إجابة مؤكدة. "
            "لو السؤال طبي فاستشر طبيبًا، ولو في مجال آخر فاستشر متخصصًا "
            "مؤهلًا في نفس المجال أو أرفق مصدرًا أوضح."
        )

    else:

        lang_instruction = (
            "Answer only in English."
        )

        refuse_msg = (
            "The uploaded source does not contain enough evidence for a reliable "
            "answer. If this is medical, please consult a doctor; otherwise "
            "consult a qualified specialist in the relevant field or upload a "
            "clearer source."
        )

    prompt = f"""
You are a grounded PDF question-answering assistant.

Rules:

{CITATION_RULES}

- {lang_instruction}
- If the answer is not supported by the evidence,
  reply exactly:
  "{refuse_msg}"
"""

    return (
        prompt,
        refuse_msg
    )


# ============================================================
# 40) TEXT-ONLY GENERATION
# ============================================================

def generate_answer_text_only(
    query,
    chunks
):

    lang = detect_language(
        query
    )

    system_prompt, refuse_msg = (
        _system_prompt(lang)
    )

    context = build_context(
        chunks
    )

    response = _invoke(

        _llm_text(
            temperature=0.1,
            max_tokens=MAX_ANSWER_TOKENS
        ),

        [

            SystemMessage(
                content=system_prompt
            ),

            HumanMessage(
                content=
                    f"Context:\n\n"
                    f"{context}\n\n"
                    f"User question: "
                    f"{query}"
            ),

        ]

    )

    return (
        response.content,
        refuse_msg
    )


# 41) RENDER VISUAL CHUNK

def render_chunk_image(
    chunk
):

    doc_path = DOCUMENT_REGISTRY[
        chunk["document_id"]
    ]["path"]

    doc = fitz.open(
        doc_path
    )

    page = doc[
        chunk["page_number"] - 1
    ]

    if chunk.get("bbox"):

        pix = page.get_pixmap(
            clip=fitz.Rect(
                chunk["bbox"]
            ),
            matrix=fitz.Matrix(
                2,
                2
            )
        )

    else:

        pix = page.get_pixmap(
            matrix=fitz.Matrix(
                2,
                2
            )
        )

    img = Image.open(
        io.BytesIO(
            pix.tobytes("png")
        )
    ).convert("RGB")

    doc.close()

    return img


# 42) FINAL MULTIMODAL GENERATION

def generate_answer_multimodal(
    query,
    all_chunks,
    visual_chunks
):

    lang = detect_language(
        query
    )

    system_prompt, refuse_msg = (
        _system_prompt(lang)
    )

    context = build_context(
        all_chunks
    )

    content = [

        {
            "type": "text",
            "text":
                f"Context:\n\n"
                f"{context}\n\n"
                f"User question: {query}"
        }

    ]

    for vc in visual_chunks[
        :MAX_VISUAL_CHUNKS_TO_VLM
    ]:

        try:

            img = render_chunk_image(
                vc
            )

            img = _prepare_image_for_vision(
                img
            )

            if img is None:
                continue

            b64 = pil_to_base64(
                img
            )

            content.append({

                "type":
                    "image_url",

                "image_url": {

                    "url":
                        f"data:image/png;base64,{b64}"

                },

            })

            content.append({

                "type":
                    "text",

                "text":
                    (
                        f"This visual evidence "
                        f"is from Page "
                        f"{vc['page_number']}."
                    ),

            })

        except Exception as e:

            print(
                f"Visual rendering warning: {e}"
            )

    response = _invoke(

        _llm_vision(
            temperature=0.1,
            max_tokens=MAX_ANSWER_TOKENS
        ),

        [

            SystemMessage(
                content=system_prompt
            ),

            HumanMessage(
                content=content
            ),

        ]

    )

    return (
        response.content,
        refuse_msg
    )


#  LAZY VISUAL EVIDENCE
#
# This is the important new component

def enrich_visual_candidates(
    query,
    candidates
):

    visual_candidates = [

        c
        for c in candidates
        if c["type"] == "image"
        or c["type"] == "visual_region"
        or c["type"] == "chart"
        or c["type"] == "diagram"

    ]

    enriched = []

    for candidate in visual_candidates[
        :MAX_VISUAL_CANDIDATES
    ]:

        # Embedded image:
        # directly send the image to VLM

        if candidate["type"] == "image":

            try:

                img = render_chunk_image(
                    candidate
                )

                el_type, desc, structure = (
                    classify_and_describe_image(
                        img
                    )
                )

                new_candidate = dict(
                    candidate
                )

                new_candidate[
                    "type"
                ] = el_type

                new_candidate[
                    "content"
                ] = desc

                new_candidate[
                    "chart_structure"
                ] = structure

                enriched.append(
                    new_candidate
                )

            except Exception as e:

                print(
                    f"Lazy VLM failed: {e}"
                )

        # Scanned page:
        # discover regions NOW

        else:

            try:

                regions = (
                    discover_visual_regions(
                        candidate
                    )
                )

                # We don't want to call VLM on every
                # discovered region
                #
                # Rank by area and keep only a few

                regions = sorted(

                    regions,

                    key=lambda r:
                        (
                            r["bbox"][2]
                            -
                            r["bbox"][0]
                        )
                        *
                        (
                            r["bbox"][3]
                            -
                            r["bbox"][1]
                        ),

                    reverse=True

                )[:MAX_VISUAL_CANDIDATES]

                for region in regions:

                    img = region.pop(
                        "_image"
                    )

                    el_type, desc, structure = (
                        classify_and_describe_image(
                            img
                        )
                    )

                    region[
                        "type"
                    ] = el_type

                    region[
                        "content"
                    ] = desc

                    region[
                        "chart_structure"
                    ] = structure

                    enriched.append(
                        region
                    )

            except Exception as e:

                print(
                    f"Lazy region analysis "
                    f"failed: {e}"
                )

    return enriched


#  CLAIM EXTRACTION

def extract_claims_with_citations(
    answer
):

    return [

        {
            "claim":
                c.strip(),

            "page":
                int(p),

        }

        for c, p in re.findall(
            r"([^.!؟\n]+?)"
            r"\s*\(Page\s*(\d+)\)",
            answer
        )

    ]


#  LLM JUDGE

def llm_judge_score(
    prompt
):

    response = _invoke(

        _llm_text(
            temperature=0,
            max_tokens=10
        ),

        [
            HumanMessage(
                content=
                    prompt
                    +
                    "\n\nRespond with ONLY "
                    "a number between 0 and 1."
            )
        ]

    )

    match = re.search(
        r"[01](\.\d+)?",
        response.content
    )

    return (
        float(match.group())
        if match
        else 0.0
    )


#  CITATION VERIFICATION

def verify_citations(
    claims,
    top_chunks
):

    verified = []

    for cl in claims:

        page_chunks = [

            c

            for c in top_chunks

            if c[
                "page_number"
            ]
            ==
            cl["page"]

        ]

        if not page_chunks:

            verified.append({

                **cl,

                "supported":
                    False,

                "score":
                    0.0,

                "note":
                    "cited page not in retrieved evidence",

            })

            continue

        evidence_text = "\n".join(

            c["content"][:400]

            for c in page_chunks

        )

        score = llm_judge_score(

            f"""
Evidence from page {cl['page']}:

{evidence_text}

Claim:

{cl['claim']}

Is this claim directly supported
by the evidence?
"""

        )

        verified.append({

            **cl,

            "supported":
                score >= 0.5,

            "score":
                score,

        })

    return verified


#  QUERY DECOMPOSITION

def decompose_query(
    query
):

    prompt = (

        "Break the following question into "
        "2-4 simpler self-contained "
        "sub-questions needed to answer it. "

        "If already simple, return it unchanged "
        "as a single-item JSON list. "

        "Respond ONLY with JSON.\n\n"

        f"Question: {query}"

    )

    response = _invoke(

        _llm_text(
            temperature=0,
            max_tokens=300
        ),

        [
            HumanMessage(
                content=prompt
            )
        ]

    )

    try:

        subs = json.loads(
            response.content
        )

        if (
            isinstance(
                subs,
                list
            )
            and subs
        ):

            return [
                str(s)
                for s in subs[:4]
            ]

    except Exception:
        pass

    return [query]


#  CROSS PAGE

def answer_cross_page(
    query,
    kb_by_id,
    faiss_store,
    bm25_retriever,
    visual_store,
    table_store=None,
    document_ids=None
):

    sub_questions = (
        decompose_query(
            query
        )
    )

    all_evidence = []

    for sq in sub_questions:

        qt = analyze_query(
            sq
        )

        top_k = (
            QUERY_TYPE_CONFIG[
                qt
            ]["top_k"]
        )

        candidates = (
            multimodal_retrieve(

                sq,

                kb_by_id,

                faiss_store,

                bm25_retriever,

                visual_store,

                qt,

                top_k,

                table_store=
                    table_store,

                document_ids=
                    document_ids,

            )
        )

        top_c, _ = rerank(
            sq,
            candidates,
            top_k=3
        )

        all_evidence.extend(
            top_c
        )

    all_evidence = (
        deduplicate_chunks(
            all_evidence
        )
    )

    context_chunks = (
        build_token_budget_context(
            all_evidence
        )
    )

    # If cross-page reasoning found visual
    # evidence, enrich lazily.
    visual_chunks = (
        enrich_visual_candidates(
            query,
            context_chunks
        )
    )

    if visual_chunks:

        final_chunks = (
            context_chunks
            +
            visual_chunks
        )

        answer, _ = (
            generate_answer_multimodal(
                query,
                final_chunks,
                visual_chunks
            )
        )

    else:

        answer, _ = (
            generate_answer_text_only(
                query,
                context_chunks
            )
        )

    sources = sorted(
        set(
            c["page_number"]
            for c in context_chunks
        )
    )

    return (
        answer,
        sources,
        context_chunks,
        sub_questions
    )


# ============================================================
# 49) HIERARCHICAL SUMMARIZATION
# ============================================================

def hierarchical_summarize(
    document_id,
    kb,
    pages_per_group=10
):

    doc_chunks = [

        c

        for c in kb

        if (
            c["document_id"]
            ==
            document_id
        )

        and

        c["type"]
        in
        (
            "text",
            "text_ocr"
        )

    ]

    if not doc_chunks:

        return (
            "No text content available "
            "to summarize."
        )

    max_page = max(
        c["page_number"]
        for c in doc_chunks
    )

    group_summaries = []

    for start in range(
        1,
        max_page + 1,
        pages_per_group
    ):

        end = (
            start
            +
            pages_per_group
            -
            1
        )

        group_text = "\n".join(

            c["content"]

            for c in doc_chunks

            if start
            <=
            c["page_number"]
            <=
            end

        )

        if not group_text.strip():
            continue

        prompt = f"""

Summarize this document section
covering pages {start}-{end}.

Keep:
- important facts
- numbers
- percentages
- names
- dates
- conclusions

Be concise.

Text:

{group_text[:6000]}
"""

        resp = _invoke(

            _llm_text(
                temperature=0.2,
                max_tokens=300
            ),

            [
                HumanMessage(
                    content=prompt
                )
            ]

        )

        group_summaries.append(

            f"Pages {start}-{end}: "
            f"{resp.content.strip()}"

        )

    reduce_prompt = (

        "Combine the following section summaries "
        "into one coherent overall summary:\n\n"

        +
        "\n\n".join(
            group_summaries
        )

    )

    resp = _invoke(

        _llm_text(
            temperature=0.2,
            max_tokens=800
        ),

        [
            HumanMessage(
                content=reduce_prompt
            )
        ]

    )

    return resp.content.strip()


# ============================================================
# 50) MAIN ASK FUNCTION
# ============================================================

def ask(
    query,
    kb,
    faiss_store,
    bm25_retriever,
    visual_store=None,
    table_store=None,
    kb_by_id=None,
    document_ids=None,
    verbose=True
):

    if kb_by_id is None:

        kb_by_id = {
            c["chunk_id"]: c
            for c in kb
        }

    filters = (
        extract_query_filters(
            query
        )
    )

    query_type = (
        analyze_query(
            query
        )
    )

    lang = detect_language(
        query
    )

    query_rewrite = rewrite_query(
        query,
        query_type=query_type,
        language=lang,
        filters=filters,
        llm_generate=_generate_query_rewrite_text
    )

    if query_rewrite.query_type in QUERY_TYPE_CONFIG:

        query_type = query_rewrite.query_type

    filters = query_rewrite.filters
    retrieval_query = query_rewrite.rewritten_query

    query_metadata = {
        "original":
            query,
        "rewritten":
            retrieval_query,
        "language":
            lang,
        "query_type":
            query_type,
        "filters":
            filters,
        "search_queries":
            query_rewrite.search_queries,
    }

    refuse_msg = (

        "المصدر المرفوع لا يحتوي على معلومات كافية لدعم إجابة مؤكدة. "
        "لو السؤال طبي فاستشر طبيبًا، ولو في مجال آخر فاستشر متخصصًا "
        "مؤهلًا في نفس المجال أو أرفق مصدرًا أوضح."

        if lang == "ar"

        else

        "The uploaded source does not contain enough evidence for a reliable "
        "answer. If this is medical, please consult a doctor; otherwise "
        "consult a qualified specialist in the relevant field or upload a "
        "clearer source."

    )

    # ========================================================
    # CROSS PAGE
    # ========================================================

    if query_type == "cross_page":

        answer, sources, chunks, sub_qs = (
            answer_cross_page(

                query,

                kb_by_id,

                faiss_store,

                bm25_retriever,

                visual_store,

                table_store,

                document_ids

            )
        )

        claims = (
            extract_claims_with_citations(
                answer
            )
        )

        verified = (
            verify_citations(
                claims,
                chunks
            )
        )

        result = {

            "answer":
                answer,

            "sources":
                sources,

            "query_type":
                query_type,

            "query":
                query_metadata,

            "confidence":
                0.0,

            "sub_questions":
                sub_qs,

            "claims":
                verified,

            "evidence": [

                {

                    "element_id":
                        c.get(
                            "element_id"
                        ),

                    "page":
                        c["page_number"],

                    "type":
                        c["type"],

                    "bbox":
                        c.get(
                            "bbox"
                        ),

                }

                for c in chunks

            ],

        }

        if verbose:

            print(
                f"\n[cross_page]"
                f"\nSub-questions: "
                f"{sub_qs}"
                f"\n\nAnswer:\n"
                f"{answer}"
                f"\nSources: "
                f"{sources}"
            )

        return result

    # ========================================================
    # SUMMARIZATION
    # ========================================================

    if (

        query_type == "summarization"

        and

        filters["page"] is None

        and

        document_ids

        and

        len(document_ids) == 1

    ):

        summary = (
            hierarchical_summarize(
                document_ids[0],
                kb
            )
        )

        if verbose:

            print(
                "\n[summarization]"
                "\n\nAnswer:\n"
                f"{summary}"
            )

        return {

            "answer":
                summary,

            "sources":
                [],

            "query_type":
                query_type,

            "query":
                query_metadata,

            "confidence":
                0.0,

            "claims":
                [],

            "evidence":
                [],

        }

    # ========================================================
    # STANDARD RETRIEVAL
    # ========================================================

    top_k = (
        QUERY_TYPE_CONFIG[
            query_type
        ]["top_k"]
    )

    candidates = (
        multimodal_retrieve(

            retrieval_query,

            kb_by_id,

            faiss_store,

            bm25_retriever,

            visual_store,

            query_type,

            top_k,

            table_store=
                table_store,

            document_ids=
                document_ids,

            query_filters=
                filters,

        )
    )

    # --------------------------------------------------------
    # RERANK
    # --------------------------------------------------------

    top_chunks, rerank_probs = rerank(

        retrieval_query,

        candidates,

        top_k=TOP_K_FINAL

    )

    confidence = (
        compute_answer_confidence(
            top_chunks,
            rerank_probs
        )
    )

    if confidence < CONFIDENCE_THRESHOLD:

        if verbose:

            print(
                f"\n[{query_type}] "
                f"confidence={confidence:.2f}"
                f"\nAnswer:\n"
                f"{refuse_msg}"
            )

        return {

            "answer":
                refuse_msg,

            "sources":
                [],

            "query_type":
                query_type,

            "query":
                query_metadata,

            "confidence":
                confidence,

            "claims":
                [],

            "evidence":
                [],

        }

    # ========================================================
    # LAZY VISUAL PIPELINE
    # ========================================================

    visual_chunks = []

    if query_type in (
        "chart_question",
        "image_question"
    ):

        print(
            "\nVisual question detected "
            "-> activating lazy VLM..."
        )

        visual_chunks = (
            enrich_visual_candidates(
                query,
                top_chunks
            )
        )

    # ========================================================
    # GENERATION
    # ========================================================

    context_chunks = (
        build_token_budget_context(
            top_chunks
        )
    )

    if visual_chunks:

        final_context = (
            context_chunks
            +
            visual_chunks
        )

        answer, _ = (
            generate_answer_multimodal(

                query,

                final_context,

                visual_chunks

            )
        )

    else:

        answer, _ = (
            generate_answer_text_only(

                query,

                context_chunks

            )
        )

    # ========================================================
    # CITATIONS
    # ========================================================

    claims = (
        extract_claims_with_citations(
            answer
        )
    )

    verified = (
        verify_citations(
            claims,
            context_chunks
            +
            visual_chunks
        )
    )

    sources = sorted(

        set(

            c["page_number"]

            for c
            in (
                context_chunks
                +
                visual_chunks
            )

        )

    )

    # ========================================================
    # EVIDENCE
    # ========================================================

    evidence = [

        {

            "element_id":
                c.get(
                    "element_id"
                ),

            "document_id":
                c["document_id"],

            "page":
                c["page_number"],

            "type":
                c["type"],

            "bbox":
                c.get(
                    "bbox"
                ),

            "section":
                c.get(
                    "section"
                ),

            "retrieval_score":
                round(
                    c.get(
                        "retrieval_score",
                        0
                    ),
                    3
                ),

            "visual_score":
                round(
                    c.get(
                        "visual_score",
                        0
                    ),
                    3
                ),

        }

        for c
        in (
            context_chunks
            +
            visual_chunks
        )

    ]

    if verbose:

        print(
            f"\n[{query_type}] "
            f"confidence="
            f"{confidence:.2f}"
            f"\n\nAnswer:\n"
            f"{answer}"
            f"\n\nSources: "
            f"{sources}"
            f"\nClaims verified: "
            f"{sum(v['supported'] for v in verified)}"
            f"/"
            f"{len(verified)}"
        )

    return {

        "answer":
            answer,

        "sources":
            sources,

        "query_type":
            query_type,

        "query":
            query_metadata,

        "confidence":
            confidence,

        "claims":
            verified,

        "evidence":
            evidence,

    }
