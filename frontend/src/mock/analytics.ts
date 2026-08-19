import type { AnalyticsBundle, DashboardStats } from "../types";

/**
 * All analytics values are SAMPLE / DEMO data — they illustrate the
 * evaluation dashboard layout, not measured system performance.
 */
export const dashboardStats: DashboardStats = {
  documents: 0, // filled from live document store
  pagesIndexed: 183,
  questionsAsked: 348,
  avgResponseMs: 1900,
};

export const analyticsBundle: AnalyticsBundle = {
  overview: [
    {
      label: "Total Queries",
      value: "348",
      hint: "across all documents",
      trend: [12, 18, 15, 22, 28, 24, 31, 35, 33, 41, 38, 46],
      good: true,
    },
    {
      label: "Avg Retrieval Latency",
      value: "148 ms",
      hint: "dense + sparse search",
      trend: [210, 195, 188, 176, 171, 165, 158, 154, 150, 149, 148, 148],
      good: true,
    },
    {
      label: "Avg Reranking Latency",
      value: "92 ms",
      hint: "cross-encoder, top-12",
      trend: [140, 132, 121, 118, 110, 105, 99, 97, 95, 94, 92, 92],
      good: true,
    },
    {
      label: "Avg Generation Latency",
      value: "1.42 s",
      hint: "grounded generation",
      trend: [1.9, 1.8, 1.75, 1.7, 1.62, 1.58, 1.55, 1.5, 1.48, 1.45, 1.43, 1.42],
      good: true,
    },
  ],

  quality: [
    { label: "Retrieval Hit Rate", value: 0.87, target: 0.85, note: "relevant doc in top-5" },
    { label: "Context Precision", value: 0.82, target: 0.8, note: "signal density in context" },
    { label: "Answer Relevance", value: 0.91, target: 0.85, note: "addresses the query" },
    { label: "Faithfulness", value: 0.89, target: 0.9, note: "claims supported by evidence" },
    { label: "Citation Accuracy", value: 0.93, target: 0.9, note: "citations point to support" },
    { label: "End-to-End Latency", value: 0.76, target: 0.8, note: "within 2.5 s budget (sample)" },
  ],

  queryTypes: [
    { label: "Text", value: 164, color: "var(--acc2)" },
    { label: "Table", value: 62, color: "var(--acc)" },
    { label: "Chart", value: 48, color: "var(--vio)" },
    { label: "Image", value: 31, color: "var(--warn)" },
    { label: "Multi-hop", value: 43, color: "var(--ok)" },
  ],

  pipelines: [
    { label: "Text RAG", value: 132, color: "var(--acc2)" },
    { label: "Hybrid Multimodal", value: 108, color: "var(--acc)" },
    { label: "Vision RAG", value: 59, color: "var(--vio)" },
    { label: "Table Retrieval", value: 49, color: "var(--ok)" },
  ],

  recentQueries: [
    {
      id: "rq-1",
      question: "What does the chart on page 12 show?",
      queryType: "chart",
      pipeline: "vision-rag",
      evidenceCount: 3,
      latencyMs: 1620,
      status: "answered",
      time: "2 min ago",
    },
    {
      id: "rq-2",
      question: "What values are listed in the comparison table?",
      queryType: "table",
      pipeline: "table-retrieval",
      evidenceCount: 3,
      latencyMs: 1480,
      status: "answered",
      time: "9 min ago",
    },
    {
      id: "rq-3",
      question: "What is tomorrow's weather forecast?",
      queryType: "text",
      pipeline: "hybrid-multimodal",
      evidenceCount: 1,
      latencyMs: 1210,
      status: "insufficient_evidence",
      time: "14 min ago",
    },
    {
      id: "rq-4",
      question: "Summarize the main findings.",
      queryType: "text",
      pipeline: "hybrid-multimodal",
      evidenceCount: 4,
      latencyMs: 1840,
      status: "answered",
      time: "31 min ago",
    },
    {
      id: "rq-5",
      question: "Explain the failover paths diagram.",
      queryType: "diagram",
      pipeline: "vision-rag",
      evidenceCount: 3,
      latencyMs: 1750,
      status: "answered",
      time: "1 h ago",
    },
    {
      id: "rq-6",
      question: "Compare Q3 margins across segments.",
      queryType: "table",
      pipeline: "table-retrieval",
      evidenceCount: 2,
      latencyMs: 1530,
      status: "answered",
      time: "2 h ago",
    },
    {
      id: "rq-7",
      question: "Which panels show thermal hotspots?",
      queryType: "image",
      pipeline: "vision-rag",
      evidenceCount: 0,
      latencyMs: 3200,
      status: "error",
      time: "3 h ago",
    },
    {
      id: "rq-8",
      question: "Compare information across two sections.",
      queryType: "multi-hop",
      pipeline: "hybrid-multimodal",
      evidenceCount: 4,
      latencyMs: 2380,
      status: "answered",
      time: "4 h ago",
    },
  ],

  services: [
    { name: "Document Index", status: "ready", latencyMs: 12, detail: "multimodal chunks · 183 pages" },
    { name: "Text Retriever", status: "ready", latencyMs: 38, detail: "dense semantic search" },
    { name: "Vision Retriever", status: "ready", latencyMs: 41, detail: "figure / diagram / OCR index" },
    { name: "Sparse Search", status: "ready", latencyMs: 9, detail: "BM25 keyword index" },
    { name: "Reranker", status: "ready", latencyMs: 88, detail: "cross-encoder · top-12" },
    { name: "LLM Gateway", status: "ready", detail: "grounded generation · citations on" },
  ],
};
