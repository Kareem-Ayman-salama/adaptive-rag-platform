import type {
  AnalyticsBundle,
  DashboardStats,
  Document,
  ExamConfig,
  GeneratedExam,
  QueryResult,
  UploadStage,
} from "../types";
import { seedDocuments, processingStages, reprocessStages } from "../mock/documents";
import { matchQuery } from "../mock/queries";
import { pickQuestions } from "../mock/exams";
import { analyticsBundle, dashboardStats } from "../mock/analytics";

/**
 * Mock API service layer.
 *
 * Every function returns a Promise with simulated latency so the UI already
 * behaves like a real client. To connect the real backend, replace the bodies
 * with `fetch(...)` calls — signatures stay the same.
 */

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let store: Document[] = [...seedDocuments];

/** Lets shell components refresh document lists after mutations. */
export const DOCS_CHANGED_EVENT = "documind:docs-changed";
const notifyDocsChanged = () => window.dispatchEvent(new CustomEvent(DOCS_CHANGED_EVENT));

const slugify = (s: string) =>
  s.toLowerCase().replace(/\.pdf$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const genericStructure = (pages: number) => [
  { page: 1, types: ["text"] as const, label: "Front matter" },
  { page: Math.max(2, Math.round(pages * 0.15)), types: ["text"] as const, label: "Introduction" },
  { page: Math.max(3, Math.round(pages * 0.3)), types: ["table"] as const, label: "Data overview · Table 1" },
  { page: Math.max(4, Math.round(pages * 0.5)), types: ["chart"] as const, label: "Key figure · Figure 1" },
  { page: Math.max(5, Math.round(pages * 0.7)), types: ["text", "image"] as const, label: "Discussion" },
  { page: pages, types: ["text"] as const, label: "Conclusion" },
].map((b) => ({ ...b, types: [...b.types] }));

export const api = {
  /* ------------------------------ documents ------------------------------ */

  async getStats(): Promise<DashboardStats> {
    await delay(350);
    return { ...dashboardStats, documents: store.length };
  },

  async getDocuments(): Promise<Document[]> {
    await delay(550);
    return [...store];
  },

  getDocumentsSync(): Document[] {
    return [...store];
  },

  async getDocument(id: string): Promise<Document | null> {
    await delay(400);
    return store.find((d) => d.id === id) ?? null;
  },

  /** Simulated upload + processing pipeline. No file ever leaves the browser. */
  async uploadDocument(
    fileName: string,
    sizeMb: number,
    onStage: (stage: UploadStage) => void
  ): Promise<Document> {
    const checkpoints = [18, 42, 64, 88, 100];
    for (let i = 0; i < processingStages.length; i++) {
      await delay(i === 0 ? 700 : 850);
      onStage({ label: processingStages[i], progress: checkpoints[i] });
    }
    const pages = 12 + ((fileName.length * 7) % 37);
    const doc: Document = {
      id: `${slugify(fileName)}-${Date.now().toString(36)}`,
      name: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
      pages,
      sizeMb: Math.max(0.2, Math.round(sizeMb * 10) / 10),
      status: "ready",
      profile: "mixed",
      contentTypes: ["text", "table", "chart", "image"],
      counts: {
        text: Math.round(pages * 0.72),
        table: Math.max(1, Math.round(pages * 0.12)),
        chart: Math.max(1, Math.round(pages * 0.09)),
        image: Math.max(1, Math.round(pages * 0.07)),
      },
      recommendedPipeline: "hybrid-multimodal",
      indexing: "indexed",
      uploadedAt: new Date().toISOString(),
      structure: genericStructure(pages),
    };
    store = [doc, ...store];
    notifyDocsChanged();
    return doc;
  },

  async reprocessDocument(id: string, onStage: (stage: UploadStage) => void): Promise<Document | null> {
    const doc = store.find((d) => d.id === id);
    if (!doc) return null;
    doc.status = "processing";
    doc.indexing = "indexing";
    const checkpoints = [30, 65, 90, 100];
    for (let i = 0; i < reprocessStages.length; i++) {
      await delay(750);
      onStage({ label: reprocessStages[i], progress: checkpoints[i] });
    }
    doc.status = "ready";
    doc.indexing = "indexed";
    doc.error = undefined;
    return { ...doc };
  },

  async deleteDocument(id: string): Promise<void> {
    await delay(450);
    store = store.filter((d) => d.id !== id);
    notifyDocsChanged();
  },

  /* ------------------------------- assistant ------------------------------ */

  /**
   * Simulated adaptive query → retrieval → rerank → generation round trip.
   * Swap `matchQuery` for a real POST /ask when the backend is ready.
   */
  async askQuestion(_documentId: string, question: string): Promise<QueryResult> {
    await delay(500);
    return matchQuery(question);
  },

  /* ------------------------------- analytics ------------------------------ */

  async getAnalytics(): Promise<AnalyticsBundle> {
    await delay(600);
    return analyticsBundle;
  },

  /* ------------------------------ exam studio ----------------------------- */

  /**
   * Simulated exam generation from a document's indexed evidence.
   * Swap for a real POST /exams/generate when the backend is ready.
   */
  async generateExam(config: ExamConfig, onStage?: (s: UploadStage) => void): Promise<GeneratedExam> {
    const doc = store.find((d) => d.id === config.documentId);
    const stages = [
      "Analyzing source document...",
      "Extracting key concepts...",
      "Drafting questions...",
      "Writing answer key...",
      "Grounding questions to evidence...",
    ];
    for (let i = 0; i < stages.length; i++) {
      onStage?.({ label: stages[i], progress: Math.round(((i + 1) / stages.length) * 92) });
      await delay(640);
    }
    onStage?.({ label: "Exam ready", progress: 100 });
    await delay(220);
    return {
      id: `exam-${Date.now().toString(36)}`,
      documentId: config.documentId,
      documentName: doc?.name ?? "Unknown document",
      config,
      questions: pickQuestions(config, doc?.name ?? ""),
      generatedAt: new Date().toISOString(),
    };
  },
};
