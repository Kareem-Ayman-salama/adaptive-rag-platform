/* ------------------------------------------------------------------ */
/* Core domain types for the Adaptive Multimodal RAG platform          */
/* ------------------------------------------------------------------ */

export type ContentType = "text" | "image" | "table" | "chart" | "diagram" | "scanned";

export type DocumentStatus = "processing" | "ready" | "failed";

export type DocumentProfile = "mixed" | "text-heavy" | "visual" | "scanned" | "table-heavy";

export type PipelineId = "text-rag" | "vision-rag" | "table-retrieval" | "hybrid-multimodal";

export type QueryType = "text" | "table" | "chart" | "image" | "diagram" | "multi-hop";

export type QueryStatus = "answered" | "insufficient_evidence" | "error";

export type IndexingStatus = "indexed" | "indexing" | "queued" | "failed";

/** One detected region on a page of a document. */
export interface PageBlock {
  page: number;
  types: ContentType[];
  label: string;
}

export interface Document {
  id: string;
  name: string;
  pages: number;
  sizeMb: number;
  status: DocumentStatus;
  profile: DocumentProfile;
  contentTypes: ContentType[];
  counts: Partial<Record<ContentType, number>>;
  recommendedPipeline: PipelineId;
  indexing: IndexingStatus;
  uploadedAt: string; // ISO date
  structure: PageBlock[];
  error?: string;
}

export interface Evidence {
  id: string;
  rank: number;
  page: number;
  contentType: ContentType;
  section?: string;
  sourceId: string;
  retrievalScore: number;
  rerankerScore?: number;
  preview: string;
}

export interface Citation {
  id: string;
  label: string;
  evidenceId: string;
}

export interface QueryResult {
  id: string;
  question: string;
  answer: string;
  queryType: QueryType;
  selectedPipeline: PipelineId;
  retrieval: string;
  rerankingEnabled: boolean;
  confidence: number;
  evidenceStrength: "high" | "medium" | "low";
  evidence: Evidence[];
  citations: Citation[];
  latencyMs: number;
  status: QueryStatus;
  answeredAt: string;
}

export interface DashboardStats {
  documents: number;
  pagesIndexed: number;
  questionsAsked: number;
  avgResponseMs: number;
}

export interface UploadStage {
  label: string;
  progress: number;
}

/* ------------------------------- analytics ------------------------------- */

export interface MetricCard {
  label: string;
  value: string;
  hint: string;
  trend: number[];
  good: boolean;
}

export interface QualityMetric {
  label: string;
  value: number; // 0..1
  target: number;
  note: string;
}

export interface DistributionItem {
  label: string;
  value: number;
  color: string; // css color
}

export interface RecentQueryRow {
  id: string;
  question: string;
  queryType: QueryType;
  pipeline: PipelineId;
  evidenceCount: number;
  latencyMs: number;
  status: QueryStatus;
  time: string;
}

export interface SystemService {
  name: string;
  status: "ready" | "warming" | "offline";
  latencyMs?: number;
  detail: string;
}

export interface AnalyticsBundle {
  overview: MetricCard[];
  quality: QualityMetric[];
  queryTypes: DistributionItem[];
  pipelines: DistributionItem[];
  recentQueries: RecentQueryRow[];
  services: SystemService[];
}

/* ------------------------------- exam studio ------------------------------ */

export type ExamQuestionType = "mcq" | "truefalse" | "short";

export type ExamDifficulty = "easy" | "medium" | "hard";

export interface ExamConfig {
  documentId: string;
  count: number;
  types: ExamQuestionType[];
  difficulty: ExamDifficulty;
  focus?: string;
}

export interface ExamQuestion {
  id: string;
  index: number;
  type: ExamQuestionType;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  answer: string;
  explanation?: string;
  difficulty: ExamDifficulty;
  source: { page: number; section: string };
}

export interface GeneratedExam {
  id: string;
  title: string;
  documentId: string;
  documentName: string;
  config: ExamConfig;
  questions: ExamQuestion[];
  confidence: number;
  hallucinationRisk: number;
  groundednessScore: number;
  sources: number[];
  generatedAt: string;
}

/* ---------------------------- assistant UI ---------------------------- */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  question?: string;
  result?: QueryResult;
}

export interface RetrievalStageState {
  label: string;
  state: "pending" | "active" | "done";
}
