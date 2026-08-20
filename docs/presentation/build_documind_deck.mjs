import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "D:/Freelance work/Ai Hackathon/adaptive-rag-platform";
const OUT = `${ROOT}/docs/presentation/documind-ai-presentation.pptx`;
const IMG_KAREEM = `${ROOT}/frontend/public/team/kareem-ayman.png`;
const IMG_JANA = `${ROOT}/frontend/public/team/jana-ashraf.png`;

const W = 1280;
const H = 720;
const page = { left: 72, top: 58, width: 1136, height: 604 };

const C = {
  bg: "#FFFFFF",
  ink: "#05070A",
  muted: "#5E6675",
  faint: "#9AA3B2",
  panel: "#F1F4F8",
  line: "#D4DAE3",
  accent: "#1677FF",
  accent2: "#6DCBF4",
  green: "#18A058",
  amber: "#B7791F",
  red: "#D64545",
};

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function addText(slide, text, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: style.fontSize ?? 20,
    color: style.color ?? C.ink,
    bold: style.bold ?? false,
    alignment: style.alignment ?? "left",
  };
  return shape;
}

function addRule(slide, x, y, width, color = C.line) {
  slide.shapes.add({
    geometry: "rect",
    position: { left: x, top: y, width, height: 2 },
    fill: color,
    line: { style: "solid", fill: color, width: 0 },
  });
}

function addFooter(slide, n) {
  addText(slide, "DocuMind AI", { left: 72, top: 672, width: 220, height: 24 }, { fontSize: 13, color: C.faint });
  addText(slide, String(n).padStart(2, "0"), { left: 1148, top: 672, width: 60, height: 24 }, { fontSize: 13, color: C.faint, alignment: "right" });
}

function addTitle(slide, eyebrow, title, subtitle, n) {
  addText(slide, eyebrow, { left: page.left, top: page.top, width: 520, height: 28 }, { fontSize: 14, color: C.accent, bold: true });
  addText(slide, title, { left: page.left, top: page.top + 50, width: 840, height: 94 }, { fontSize: 38, color: C.ink, bold: true });
  if (subtitle) {
    addText(slide, subtitle, { left: page.left, top: page.top + 150, width: 720, height: 62 }, { fontSize: 20, color: C.muted });
  }
  addFooter(slide, n);
}

function addPanel(slide, position, fill = C.panel) {
  return slide.shapes.add({
    geometry: "roundRect",
    position,
    fill,
    line: { style: "solid", fill: C.line, width: 1 },
    borderRadius: "rounded-xl",
  });
}

function addBulletList(slide, items, position, options = {}) {
  const text = items.map((item) => `• ${item}`).join("\n");
  addText(slide, text, position, {
    fontSize: options.fontSize ?? 20,
    color: options.color ?? C.muted,
  });
}

function addLabel(slide, text, x, y, w = 180, color = C.accent) {
  const box = slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: 34 },
    fill: "#EAF3FF",
    line: { style: "solid", fill: "#BBD7FF", width: 1 },
    borderRadius: "rounded-lg",
  });
  box.text = text;
  box.text.style = { fontSize: 15, bold: true, color, alignment: "center" };
}

function addMetric(slide, number, label, x, y, w = 230) {
  addPanel(slide, { left: x, top: y, width: w, height: 128 }, "#F7F9FC");
  addText(slide, number, { left: x + 22, top: y + 22, width: w - 44, height: 46 }, { fontSize: 34, bold: true, color: C.accent });
  addText(slide, label, { left: x + 22, top: y + 74, width: w - 44, height: 36 }, { fontSize: 17, color: C.muted });
}

function addNotes(slide, sourceLines) {
  slide.speakerNotes.textFrame.setText([
    "[Sources]",
    ...sourceLines,
  ]);
  slide.speakerNotes.setVisible(true);
}

async function addTeamPhoto(slide, imagePath, x, y, name) {
  const blob = await readImageBlob(imagePath);
  slide.images.add({
    blob,
    contentType: "image/png",
    alt: `${name} photo`,
    fit: "cover",
    position: { left: x, top: y, width: 150, height: 150 },
    geometry: "roundRect",
    borderRadius: "rounded-xl",
  });
}

async function main() {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });

  // 1
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addText(slide, "DocuMind AI", { left: 72, top: 96, width: 660, height: 74 }, { fontSize: 60, bold: true });
    addText(slide, "Adaptive multimodal RAG for source-grounded PDF intelligence", { left: 72, top: 184, width: 780, height: 40 }, { fontSize: 24, color: C.muted });
    addRule(slide, 72, 258, 280, C.accent);
    addText(slide, "Supervisor: Eng / Jana Hatem\nAssistant Engineer: Gad Amr\nTeam: Kemet AI", { left: 72, top: 306, width: 520, height: 116 }, { fontSize: 22, color: C.ink });
    addPanel(slide, { left: 770, top: 108, width: 360, height: 392 }, "#F7F9FC");
    addText(slide, "PDF → Evidence → Answer → Exam", { left: 808, top: 156, width: 285, height: 120 }, { fontSize: 34, bold: true });
    addText(slide, "Built for source-only answers, hallucination control, and educator workflows.", { left: 808, top: 314, width: 275, height: 84 }, { fontSize: 21, color: C.muted });
    addFooter(slide, 1);
    addNotes(slide, ["Project repository and local documentation: docs/PROJECT_DOCUMENTATION.md"]);
  }

  // 2
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addTitle(slide, "THE PROBLEM", "PDF intelligence fails when the document is more than text", "Academic and technical PDFs mix tables, charts, diagrams, scanned pages, and cross-page context.", 2);
    addBulletList(slide, [
      "Text-only extraction loses layout, tables, and visual evidence.",
      "Generic chatbots may answer from outside the uploaded source.",
      "Unsupported answers are risky in medical and educational contexts.",
      "Teachers need questions, answer keys, and source pages from one workflow.",
    ], { left: 110, top: 300, width: 780, height: 220 }, { fontSize: 23 });
    addLabel(slide, "Need: verifiable source-only AI", 900, 332, 260);
    addNotes(slide, ["README.md", "docs/PROJECT_DOCUMENTATION.md"]);
  }

  // 3
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addTitle(slide, "THE SOLUTION", "DocuMind turns uploaded PDFs into trusted answers and exams", "The platform combines retrieval, citation grounding, refusal behavior, and structured exam generation.", 3);
    addMetric(slide, "Source-only", "Answers are limited to uploaded PDFs", 92, 306);
    addMetric(slide, "Evidence", "Page-level traces and citations", 382, 306);
    addMetric(slide, "Exam Studio", "Questions with answer keys", 672, 306);
    addMetric(slide, "Persistence", "PDFs rebuild indexes after restart", 962, 306);
    addNotes(slide, ["backend/documind_rag/app/schemas.py", "backend/documind_rag/rag/service.py", "frontend/src/pages/ExamStudioPage.tsx"]);
  }

  // 4
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addTitle(slide, "PRODUCT FLOW", "The user journey is simple enough for a live demo", "Upload a source, ask a question, inspect evidence, then generate an exam from the same PDF.", 4);
    const steps = ["Upload PDF", "Build indexes", "Ask question", "Verify evidence", "Generate exam"];
    steps.forEach((s, i) => {
      const x = 92 + i * 224;
      addPanel(slide, { left: x, top: 338, width: 174, height: 106 }, i === 4 ? "#EAF3FF" : "#F7F9FC");
      addText(slide, String(i + 1).padStart(2, "0"), { left: x + 18, top: 354, width: 60, height: 30 }, { fontSize: 20, bold: true, color: C.accent });
      addText(slide, s, { left: x + 18, top: 394, width: 132, height: 34 }, { fontSize: 20, bold: true });
      if (i < steps.length - 1) addRule(slide, x + 174, 390, 50, C.accent2);
    });
    addNotes(slide, ["frontend/src/pages/DocumentsPage.tsx", "frontend/src/pages/AssistantPage.tsx", "frontend/src/pages/ExamStudioPage.tsx"]);
  }

  // 5
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addTitle(slide, "SYSTEM ARCHITECTURE", "Frontend, API, database, and RAG service stay cleanly separated", "The architecture is production-oriented while still practical for Railway deployment.", 5);
    const rows = [
      ["React + Vite", "Responsive workspace, assistant, evidence, exams"],
      ["FastAPI", "Auth, upload, ask, exam, health endpoints"],
      ["PostgreSQL", "Users and persisted PDF sources"],
      ["RAG Manager", "Per-chat FAISS/BM25 runtime indexes"],
      ["Groq LLM", "Source-grounded generation"],
    ];
    rows.forEach((r, i) => {
      const y = 262 + i * 64;
      addText(slide, r[0], { left: 120, top: y, width: 210, height: 32 }, { fontSize: 22, bold: true, color: C.accent });
      addText(slide, r[1], { left: 360, top: y, width: 720, height: 32 }, { fontSize: 20, color: C.muted });
      addRule(slide, 120, y + 44, 920, C.line);
    });
    addNotes(slide, ["backend/documind_rag/app/main.py", "backend/documind_rag/app/core/database.py", "Dockerfile"]);
  }

  // 6
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addTitle(slide, "RAG PIPELINE", "The pipeline retrieves before it writes", "Query rewriting, routing, hybrid retrieval, reranking, and verification reduce unsupported answers.", 6);
    const items = ["Rewrite", "Classify", "Retrieve", "Rerank", "Build context", "Generate", "Verify"];
    items.forEach((item, i) => {
      const x = 80 + (i % 4) * 288;
      const y = i < 4 ? 290 : 440;
      addPanel(slide, { left: x, top: y, width: 230, height: 88 }, "#F7F9FC");
      addText(slide, item, { left: x + 22, top: y + 28, width: 186, height: 30 }, { fontSize: 22, bold: true, color: i >= 5 ? C.green : C.ink, alignment: "center" });
    });
    addNotes(slide, ["backend/documind_rag/rag/service.py", "backend/documind_rag/rag/notebook_core.py"]);
  }

  // 7
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addTitle(slide, "TRUST LAYER", "Unsupported questions are refused instead of guessed", "The system blocks weak evidence and guides users to a doctor or qualified specialist when the source is insufficient.", 7);
    addPanel(slide, { left: 104, top: 298, width: 490, height: 170 }, "#FFF7ED");
    addText(slide, "If the PDF does not contain enough evidence, the answer is withheld.", { left: 136, top: 336, width: 420, height: 70 }, { fontSize: 25, bold: true, color: C.amber });
    addPanel(slide, { left: 680, top: 298, width: 424, height: 170 }, "#F0FDF4");
    addText(slide, "The response includes confidence, groundedness, hallucination risk, and source pages.", { left: 712, top: 336, width: 360, height: 80 }, { fontSize: 24, bold: true, color: C.green });
    addNotes(slide, ["backend/documind_rag/rag/service.py", "backend/documind_rag/rag/notebook_core.py", "frontend/src/pages/AssistantPage.tsx"]);
  }

  // 8
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addTitle(slide, "EXAM STUDIO", "The same source can generate assessment material", "Doctors, professors, and teaching assistants can set count, difficulty, type, and focus topic.", 8);
    addBulletList(slide, [
      "Structured JSON exam response through Pydantic.",
      "MCQ, true/false, short answer, and essay-ready schema.",
      "Answer key, explanation, page, and section per question.",
      "Groundedness and hallucination risk visible in the UI.",
    ], { left: 102, top: 292, width: 600, height: 230 }, { fontSize: 23 });
    addPanel(slide, { left: 780, top: 288, width: 330, height: 210 }, "#F7F9FC");
    addText(slide, "Exam output is not a paragraph; it is an API contract.", { left: 812, top: 334, width: 268, height: 110 }, { fontSize: 27, bold: true, color: C.accent });
    addNotes(slide, ["backend/documind_rag/app/controllers/exam_controller.py", "backend/documind_rag/app/schemas.py", "frontend/src/pages/ExamStudioPage.tsx"]);
  }

  // 9
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addTitle(slide, "PERSISTENCE", "PDFs survive restarts, while FAISS stays fast at runtime", "The system persists source bytes in PostgreSQL and rebuilds indexes automatically when needed.", 9);
    addBulletList(slide, [
      "Upload stores PDF bytes per user and chat.",
      "Runtime FAISS/BM25 indexes remain lightweight.",
      "After restart, missing index triggers automatic rebuild.",
      "The original ask or exam request is retried after rebuild.",
    ], { left: 102, top: 292, width: 680, height: 230 }, { fontSize: 23 });
    addLabel(slide, "PostgreSQL source store", 842, 322, 270);
    addLabel(slide, "Automatic rebuild", 842, 384, 270, C.green);
    addLabel(slide, "Railway ready", 842, 446, 270, C.accent);
    addNotes(slide, ["backend/documind_rag/app/models/document_source.py", "backend/documind_rag/app/repositories/document_repository.py", "backend/documind_rag/app/controllers/index_rebuild.py"]);
  }

  // 10
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addTitle(slide, "PRODUCTION DEPLOYMENT", "One Railway service serves both API and frontend", "The root Dockerfile builds the Vite app, installs the FastAPI backend, and serves the SPA from the same container.", 10);
    addMetric(slide, "Docker", "Frontend build + backend runtime", 120, 310, 300);
    addMetric(slide, "Postgres", "Auth and persisted sources", 490, 310, 300);
    addMetric(slide, "/health", "Railway healthcheck path", 860, 310, 300);
    addNotes(slide, ["Dockerfile", "railway.json", "backend/requirements.txt", "frontend/package.json"]);
  }

  // 11
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addTitle(slide, "ROADMAP", "The next upgrades move the platform from demo to scale", "The current product is hackathon-ready; the roadmap focuses on larger datasets, evaluation, and operations.", 11);
    addBulletList(slide, [
      "Full Arabic/English i18n across the frontend.",
      "Background indexing jobs and progress streaming.",
      "Optional pgvector or Qdrant for large persistent vector stores.",
      "Automated RAG evaluation datasets and Playwright smoke tests.",
      "Exam export to PDF/DOCX and role-based permissions.",
    ], { left: 118, top: 292, width: 850, height: 240 }, { fontSize: 23 });
    addNotes(slide, ["docs/PROJECT_DOCUMENTATION.md", "README.md"]);
  }

  // 12
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.bg;
    addTitle(slide, "TEAM AND CREDITS", "Kemet AI built DocuMind around trust, evidence, and education", "The platform is ready to demonstrate with uploaded PDFs, source-only answers, and exam generation.", 12);
    await addTeamPhoto(slide, IMG_KAREEM, 120, 292, "Kareem Ayman");
    await addTeamPhoto(slide, IMG_JANA, 330, 292, "Jana Ashraf");
    addText(slide, "Kareem Ayman", { left: 120, top: 458, width: 150, height: 28 }, { fontSize: 18, bold: true, alignment: "center" });
    addText(slide, "Jana Ashraf", { left: 330, top: 458, width: 150, height: 28 }, { fontSize: 18, bold: true, alignment: "center" });
    addText(slide, "Sama Hany\nSara Elsafty\nNadin Farid", { left: 620, top: 304, width: 250, height: 130 }, { fontSize: 24, bold: true });
    addText(slide, "Supervisor: Eng / Jana Hatem\nAssistant Engineer: Gad Amr", { left: 620, top: 472, width: 420, height: 78 }, { fontSize: 22, color: C.muted });
    addNotes(slide, ["frontend/public/team/kareem-ayman.png", "frontend/public/team/jana-ashraf.png", "User-provided supervision credits"]);
  }

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(OUT);
  console.log(OUT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
