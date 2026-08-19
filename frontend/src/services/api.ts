/// <reference types="vite/client" />

import type {
  AnalyticsBundle,
  DashboardStats,
  Document,
  ExamConfig,
  ExamQuestion,
  ExamQuestionType,
  GeneratedExam,
  PipelineId,
  QueryResult,
  QueryType,
  UploadStage,
} from "../types";
import { auth } from "./auth";
import { analyticsBundle, dashboardStats } from "../mock/analytics";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const DOCS_STORAGE_KEY = "documind:documents";

export const DOCS_CHANGED_EVENT = "documind:docs-changed";

const notifyDocsChanged = () => window.dispatchEvent(new CustomEvent(DOCS_CHANGED_EVENT));
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const slugify = (s: string) =>
  s.toLowerCase().replace(/\.pdf$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const loadDocuments = (): Document[] => {
  try {
    const raw = localStorage.getItem(DOCS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Document[]) : [];
  } catch {
    return [];
  }
};

let store: Document[] = loadDocuments();

const saveDocuments = () => {
  localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(store));
  notifyDocsChanged();
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
};

const authHeaders = (): Record<string, string> => {
  const token = auth.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type BackendEvidence = {
  element_id?: string | null;
  document_id?: string | null;
  page: number;
  type: string;
  section?: string | null;
  retrieval_score?: number | null;
  visual_score?: number | null;
};

type BackendAskResponse = {
  answer: string;
  query: {
    original: string;
    rewritten: string;
    language: "ar" | "en";
    query_type: string;
  };
  confidence: number;
  hallucination_risk: number;
  groundedness_score: number;
  sources: number[];
  evidence: BackendEvidence[];
  claims: Array<{ claim: string; page: number; supported?: boolean | null }>;
};

type BackendBuildResponse = {
  documents: Record<string, { filename?: string; page_count?: number; document_type?: string }>;
  chunk_count: number;
  ready: boolean;
};

const toContentType = (type: string): Document["contentTypes"][number] => {
  if (type === "text_ocr") return "scanned";
  if (type === "visual_region") return "image";
  if (["text", "image", "table", "chart", "diagram", "scanned"].includes(type)) {
    return type as Document["contentTypes"][number];
  }
  return "text";
};

const toQueryType = (type: string): QueryType => {
  const map: Record<string, QueryType> = {
    factual_text: "text",
    exact_lookup: "text",
    table_question: "table",
    chart_question: "chart",
    image_question: "image",
    summarization: "multi-hop",
    cross_page: "multi-hop",
  };
  return map[type] ?? "text";
};

const toPipeline = (type: string): PipelineId => {
  if (type.includes("table")) return "table-retrieval";
  if (type.includes("chart") || type.includes("image")) return "vision-rag";
  return "hybrid-multimodal";
};

const mapAskResponse = (documentId: string, question: string, data: BackendAskResponse, startedAt: number): QueryResult => {
  const evidence = data.evidence.map((item, index) => ({
    id: item.element_id ?? `${documentId}-ev-${index}`,
    rank: index + 1,
    page: item.page,
    contentType: toContentType(item.type),
    section: item.section ?? item.type,
    sourceId: item.document_id ?? documentId,
    retrievalScore: item.retrieval_score ?? data.confidence,
    rerankerScore: undefined,
    preview: `${item.type} evidence from page ${item.page}`,
  }));
  const answered = data.groundedness_score >= 0.35 && data.answer.trim().length > 0;

  return {
    id: `q-${Date.now().toString(36)}`,
    question,
    answer: data.answer.replace(/\(Page\s*(\d+)\)/gi, "[Page $1]"),
    queryType: toQueryType(data.query.query_type),
    selectedPipeline: toPipeline(data.query.query_type),
    retrieval: data.query.rewritten === question ? "hybrid search" : `rewritten: ${data.query.rewritten}`,
    rerankingEnabled: true,
    confidence: data.confidence,
    evidenceStrength: data.groundedness_score > 0.75 ? "high" : data.groundedness_score > 0.45 ? "medium" : "low",
    evidence,
    citations: evidence.map((ev) => ({
      id: `cit-${ev.id}`,
      label: `Page ${ev.page} · ${ev.section ?? ev.contentType}`,
      evidenceId: ev.id,
    })),
    latencyMs: Date.now() - startedAt,
    status: answered ? "answered" : "insufficient_evidence",
    answeredAt: new Date().toISOString(),
  };
};

const documentFromUpload = (chatId: string, file: File, build: BackendBuildResponse): Document => {
  const meta = Object.values(build.documents)[0];
  const pages = meta?.page_count ?? Math.max(1, Math.round(file.size / 90_000));
  return {
    id: chatId,
    name: meta?.filename ?? file.name,
    pages,
    sizeMb: Math.max(0.1, Math.round((file.size / (1024 * 1024)) * 10) / 10),
    status: build.ready ? "ready" : "failed",
    profile: meta?.document_type === "scanned" ? "scanned" : meta?.document_type === "text-heavy" ? "text-heavy" : "mixed",
    contentTypes: ["text", "table", "chart", "image"],
    counts: {
      text: Math.max(1, Math.round(build.chunk_count * 0.7)),
      table: Math.max(0, Math.round(build.chunk_count * 0.1)),
      chart: Math.max(0, Math.round(build.chunk_count * 0.1)),
      image: Math.max(0, Math.round(build.chunk_count * 0.1)),
    },
    recommendedPipeline: "hybrid-multimodal",
    indexing: build.ready ? "indexed" : "failed",
    uploadedAt: new Date().toISOString(),
    structure: [
      { page: 1, types: ["text"], label: "Document start" },
      { page: Math.max(1, Math.round(pages / 2)), types: ["table", "chart"], label: "Detected evidence" },
      { page: pages, types: ["text"], label: "Document end" },
    ],
    error: build.ready ? undefined : "Backend indexing did not complete.",
  };
};

const parseExamQuestions = (answer: string, config: ExamConfig): ExamQuestion[] => {
  const lines = answer.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const questionLines = lines.filter((line) => /^(\d+[\).\-\s]|Q\d+)/i.test(line));
  const selected = (questionLines.length ? questionLines : lines).slice(0, config.count);

  return selected.map((line, index) => ({
    id: `exam-q-${Date.now().toString(36)}-${index}`,
    index: index + 1,
    type: "short" as ExamQuestionType,
    prompt: line.replace(/^(\d+[\).\-\s]|Q\d+[:.\-\s]*)/i, ""),
    answer: "See generated answer key in the backend response.",
    explanation: "Generated from the uploaded source and grounded through the RAG pipeline.",
    difficulty: config.difficulty,
    source: { page: 1, section: "Generated from source" },
  }));
};

export const api = {
  async getStats(): Promise<DashboardStats> {
    return {
      ...dashboardStats,
      documents: store.length,
      pagesIndexed: store.reduce((sum, doc) => sum + doc.pages, 0),
    };
  },

  async getDocuments(): Promise<Document[]> {
    return [...store];
  },

  getDocumentsSync(): Document[] {
    return [...store];
  },

  async getDocument(id: string): Promise<Document | null> {
    return store.find((doc) => doc.id === id) ?? null;
  },

  async uploadDocument(file: File, onStage: (stage: UploadStage) => void): Promise<Document> {
    const chatId = `${slugify(file.name)}-${Date.now().toString(36)}`;
    const form = new FormData();
    form.append("files", file);
    onStage({ label: "Uploading source to backend...", progress: 12 });

    const build = await requestJson<BackendBuildResponse>(`/chats/${chatId}/sources`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });

    onStage({ label: "Finalizing source workspace...", progress: 92 });
    await delay(150);
    const doc = documentFromUpload(chatId, file, build);
    store = [doc, ...store.filter((item) => item.id !== doc.id)];
    saveDocuments();
    onStage({ label: "Ready", progress: 100 });
    return doc;
  },

  async reprocessDocument(id: string, onStage: (stage: UploadStage) => void): Promise<Document | null> {
    const doc = store.find((item) => item.id === id);
    if (!doc) return null;
    onStage({ label: "Reprocessing from saved backend source is not available yet.", progress: 100 });
    return doc;
  },

  async deleteDocument(id: string): Promise<void> {
    store = store.filter((doc) => doc.id !== id);
    saveDocuments();
  },

  async askQuestion(documentId: string, question: string): Promise<QueryResult> {
    const startedAt = Date.now();
    const data = await requestJson<BackendAskResponse>("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ chat_id: documentId, query: question, verbose: false, use_memory: true }),
    });
    return mapAskResponse(documentId, question, data, startedAt);
  },

  async getAnalytics(): Promise<AnalyticsBundle> {
    return analyticsBundle;
  },

  async generateExam(config: ExamConfig, onStage?: (s: UploadStage) => void): Promise<GeneratedExam> {
    const doc = store.find((item) => item.id === config.documentId);
    onStage?.({ label: "Sending exam request to backend...", progress: 20 });
    const data = await requestJson<BackendAskResponse>("/exam", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        chat_id: config.documentId,
        topic: config.focus,
        difficulty: config.difficulty,
        question_count: config.count,
        total_marks: 100,
        question_types: config.types.map((type) => (type === "truefalse" ? "true_false" : type)),
        language: "ar",
      }),
    });
    onStage?.({ label: "Parsing grounded exam...", progress: 90 });
    await delay(120);

    return {
      id: `exam-${Date.now().toString(36)}`,
      documentId: config.documentId,
      documentName: doc?.name ?? "Uploaded source",
      config,
      questions: parseExamQuestions(data.answer, config),
      generatedAt: new Date().toISOString(),
    };
  },
};
