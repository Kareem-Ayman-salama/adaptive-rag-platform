import type { Evidence } from "../types";

/**
 * Reusable mock evidence sets, keyed by scenario. Scores are illustrative
 * demo values, not measured results.
 */
const ev = (
  id: string,
  rank: number,
  page: number,
  contentType: Evidence["contentType"],
  section: string | undefined,
  sourceId: string,
  retrievalScore: number,
  rerankerScore: number,
  preview: string
): Evidence => ({
  id,
  rank,
  page,
  contentType,
  section,
  sourceId,
  retrievalScore,
  rerankerScore,
  preview,
});

export const evidenceSets: Record<string, Evidence[]> = {
  summary: [
    ev("e-sum-1", 1, 9, "text", "Section 3.1 · Results", "src://ai-research-report/p9/c2", 0.82, 0.9,
      "Structure-aware chunking lifted retrieval hit rate by 11–14% over naive fixed-size chunking across all evaluated benchmarks."),
    ev("e-sum-2", 2, 12, "chart", "Figure 3", "src://ai-research-report/p12/fig3", 0.78, 0.88,
      "Latency–throughput curve for four retrieval configurations; adaptive hybrid sustains the highest throughput under load."),
    ev("e-sum-3", 3, 18, "table", "Table 4", "src://ai-research-report/p18/tbl4", 0.74, 0.85,
      "Benchmark comparison: adaptive multimodal 0.87 hit rate / 0.82 precision / 0.91 relevance vs. text-only 0.74 / 0.68 / 0.83."),
    ev("e-sum-4", 4, 42, "text", "Section 6 · Conclusion", "src://ai-research-report/p42/c1", 0.69, 0.81,
      "Routing by detected content type is the strongest predictor of answer faithfulness in the evaluated corpus."),
  ],
  chartPage12: [
    ev("e-ch-1", 1, 12, "chart", "Figure 3", "src://ai-research-report/p12/fig3", 0.86, 0.94,
      "Relevant visual evidence: latency–throughput comparison. Adaptive hybrid crosses the 200 ms p95 budget near 40 qps; text-only near 25 qps."),
    ev("e-ch-2", 2, 7, "text", "Section 2.4 · Evaluation design", "src://ai-research-report/p7/c4", 0.71, 0.83,
      "The 200 ms p95 latency budget is defined as the service-level target for all interactive queries."),
    ev("e-ch-3", 3, 36, "chart", "Figure 8", "src://ai-research-report/p36/fig8", 0.66, 0.78,
      "Scaling trends replicate the Figure 3 ordering at 4× document volume."),
  ],
  tableValues: [
    ev("e-tb-1", 1, 18, "table", "Table 4", "src://ai-research-report/p18/tbl4", 0.9, 0.96,
      "Benchmark comparison — rows: Adaptive Multimodal, Text-only RAG, Keyword-only, Naive hybrid; columns: Hit rate, Context precision, Answer relevance, Faithfulness, E2E latency."),
    ev("e-tb-2", 2, 5, "table", "Table 1", "src://ai-research-report/p5/tbl1", 0.72, 0.8,
      "Dataset composition: 1.2k mixed-modality documents, 58% text-heavy, 22% table-heavy, 20% visual."),
    ev("e-tb-3", 3, 9, "text", "Section 3.1 · Results", "src://ai-research-report/p9/c2", 0.68, 0.77,
      "Numeric gains referenced in Table 4 are consistent with the per-benchmark breakdown reported here."),
  ],
  diagram: [
    ev("e-dg-1", 1, 21, "diagram", "Figure 5", "src://ai-research-report/p21/fig5", 0.88, 0.93,
      "End-to-end system flow: analyzer → modality indexes → router → text / vision / table pipelines → fusion → reranker → generation."),
    ev("e-dg-2", 2, 24, "text", "Section 4.3 · Router feedback", "src://ai-research-report/p24/c1", 0.7, 0.82,
      "A feedback edge from the evaluator updates routing priors using retrieval outcomes from prior queries."),
    ev("e-dg-3", 3, 3, "image", "Figure 1", "src://ai-research-report/p3/fig1", 0.64, 0.75,
      "Methodology overview figure showing where the diagrammed system sits inside the evaluation harness."),
  ],
  conclusion: [
    ev("e-co-1", 1, 42, "text", "Section 6 · Conclusion", "src://ai-research-report/p42/c1", 0.89, 0.95,
      "No single retrieval strategy is sufficient for heterogeneous documents; hybrid multimodal retrieval is recommended as the default for mixed content."),
    ev("e-co-2", 2, 40, "text", "Section 5.2 · Limitations", "src://ai-research-report/p40/c2", 0.77, 0.86,
      "Evidence grounding is treated as a hard requirement, not a display feature: answers without retrievable support are withheld."),
    ev("e-co-3", 3, 2, "text", "Introduction", "src://ai-research-report/p2/c3", 0.65, 0.74,
      "The report motivates adaptive routing from the failure modes of single-pipeline PDF RAG."),
  ],
  multihop: [
    ev("e-mh-1", 1, 9, "text", "Section 3.1 · Results", "src://ai-research-report/p9/c2", 0.84, 0.91,
      "11–14% hit-rate gain attributed to structure-aware chunking."),
    ev("e-mh-2", 2, 15, "text", "Section 4.2 · Routing analysis", "src://ai-research-report/p15/c1", 0.81, 0.9,
      "Most of the latency improvement is attributed to routing rather than to the index itself."),
    ev("e-mh-3", 3, 18, "table", "Table 4", "src://ai-research-report/p18/tbl4", 0.73, 0.84,
      "Combined metrics where both effects are visible side by side."),
    ev("e-mh-4", 4, 12, "chart", "Figure 3", "src://ai-research-report/p12/fig3", 0.67, 0.76,
      "Supporting latency curves for the routing claim."),
  ],
  generic: [
    ev("e-gn-1", 1, 7, "text", "Section 2.4 · Evaluation design", "src://ai-research-report/p7/c4", 0.61, 0.72,
      "Describes how the evaluation was constructed and which metrics were prioritized."),
    ev("e-gn-2", 2, 9, "text", "Section 3.1 · Results", "src://ai-research-report/p9/c2", 0.58, 0.69,
      "Provides supporting numeric context for the methodology."),
  ],
  weak: [
    ev("e-wk-1", 1, 2, "text", "Introduction", "src://ai-research-report/p2/c1", 0.24, 0.18,
      "Loose lexical overlap only — the passage shares keywords but not meaning with the question."),
  ],
};
