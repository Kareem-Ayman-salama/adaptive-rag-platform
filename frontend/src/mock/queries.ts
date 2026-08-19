import type { Citation, QueryResult } from "../types";
import { evidenceSets } from "./evidence";

/** Suggested questions shown in the assistant empty state. */
export const suggestedQuestions = [
  "Summarize the main findings.",
  "What does the chart on page 12 show?",
  "What values are listed in the comparison table?",
  "Explain the architecture diagram.",
  "What conclusion does the report reach?",
  "Compare information across two sections.",
];

/** One deliberately unanswerable question used to demo the safety state. */
export const unanswerableExample = "What is tomorrow's weather forecast?";

const insufficientTriggers = [
  "weather",
  "bitcoin",
  "stock price",
  "president",
  "recipe",
  "football",
  "movie",
  "horoscope",
  "crypto",
];

const cite = (evidenceId: string, label: string): Citation => ({
  id: `cit-${evidenceId}`,
  label,
  evidenceId,
});

const base = (
  id: string,
  question: string,
  answer: string,
  over: Partial<QueryResult> &
    Pick<QueryResult, "queryType" | "selectedPipeline" | "confidence" | "latencyMs">,
  evidenceKey: string
): QueryResult => {
  const evidence = evidenceSets[evidenceKey];
  return {
    id,
    question,
    answer,
    retrieval: "Dense + BM25",
    rerankingEnabled: true,
    evidenceStrength: "high",
    evidence,
    citations: evidence.slice(0, 3).map((e) =>
      cite(e.id, `Page ${e.page} · ${e.section ?? e.contentType}`)
    ),
    status: "answered",
    answeredAt: new Date().toISOString(),
    ...over,
  };
};

const canned: QueryResult[] = [
  base(
    "q-summary",
    "Summarize the main findings.",
    "The report's central finding is that adaptive, modality-aware retrieval consistently outperforms a single text-only pipeline. Across the evaluated benchmarks, structure-aware chunking lifted retrieval hit rate by 11–14% over naive chunking [Page 9 · Section 3.1 · Results], and routing each query to a modality-specific pipeline reduced pressure on the latency budget substantially [Page 12 · Figure 3]. The authors also note that table-aware parsing preserves header relationships that flat text extraction loses, which materially improves faithfulness on numeric questions [Page 18 · Table 4].",
    { queryType: "text", selectedPipeline: "hybrid-multimodal", confidence: 0.91, latencyMs: 1840 },
    "summary"
  ),
  base(
    "q-chart",
    "What does the chart on page 12 show?",
    "Figure 3 on page 12 is a latency–throughput comparison across four retrieval configurations. The adaptive hybrid pipeline sustains the highest throughput before latency degrades, crossing the 200 ms p95 budget at roughly 40 queries per second, while the text-only baseline crosses the same budget near 25 qps [Page 12 · Figure 3]. The shaded region marks the service-level target defined earlier in the report [Page 7 · Section 2.4 · Evaluation design].",
    { queryType: "chart", selectedPipeline: "vision-rag", confidence: 0.93, latencyMs: 1620 },
    "chartPage12"
  ),
  base(
    "q-table",
    "What values are listed in the comparison table?",
    "Table 4 on page 18 compares four systems across five metrics. The adaptive multimodal pipeline scores 0.87 retrieval hit rate, 0.82 context precision, and 0.91 answer relevance, versus 0.74 / 0.68 / 0.83 for the strongest text-only baseline [Page 18 · Table 4]. The final column reports end-to-end latency: 1.9 s for the adaptive system against 2.4 s for the baseline [Page 18 · Table 4].",
    { queryType: "table", selectedPipeline: "table-retrieval", confidence: 0.95, latencyMs: 1480 },
    "tableValues"
  ),
  base(
    "q-diagram",
    "Explain the architecture diagram.",
    "The diagram on page 21 shows the end-to-end flow: the document analyzer feeds modality-specific indexes, the query analyzer routes each question to the text, vision, or table pipeline, and a fusion layer merges dense and sparse results before the reranker [Page 21 · Figure 5]. Note the feedback edge from the evaluator back to the router — the authors use retrieval outcomes to update routing priors [Page 24 · Section 4.3 · Router feedback].",
    { queryType: "diagram", selectedPipeline: "vision-rag", confidence: 0.9, latencyMs: 1750 },
    "diagram"
  ),
  base(
    "q-conclusion",
    "What conclusion does the report reach?",
    "The report concludes that no single retrieval strategy is sufficient for heterogeneous documents: routing by detected content type is the strongest predictor of answer faithfulness [Page 42 · Section 6 · Conclusion]. It recommends hybrid multimodal retrieval as the default for mixed documents, with evidence grounding treated as a hard requirement rather than a display feature [Page 40 · Section 5.2 · Limitations].",
    { queryType: "text", selectedPipeline: "hybrid-multimodal", confidence: 0.92, latencyMs: 1560 },
    "conclusion"
  ),
  base(
    "q-multihop",
    "Compare information across two sections.",
    "Section 3.1 reports an 11–14% hit-rate gain from structure-aware chunking [Page 9 · Section 3.1 · Results], while Section 4.2 attributes most of the latency win to routing rather than to the index itself [Page 15 · Section 4.2 · Routing analysis]. Read together, the two sections suggest the gains are complementary: better chunks improve what is retrievable, and better routing improves which pipeline retrieves it [Page 18 · Table 4].",
    { queryType: "multi-hop", selectedPipeline: "hybrid-multimodal", confidence: 0.88, latencyMs: 2380 },
    "multihop"
  ),
];

const genericResult = (): QueryResult =>
  base(
    "q-generic",
    "",
    "The document addresses this most directly in its methodology and results sections. The strongest retrieved passage describes how the evaluation was constructed and which metrics were prioritized [Page 7 · Section 2.4 · Evaluation design], with supporting numeric context in the results section [Page 9 · Section 3.1 · Results]. Based on the retrieved evidence, the document frames the topic as an open but measurable problem rather than making a single definitive claim.",
    { queryType: "text", selectedPipeline: "hybrid-multimodal", confidence: 0.74, latencyMs: 1930 },
    "generic"
  );

const insufficientResult = (question: string): QueryResult => ({
  id: "q-insufficient",
  question,
  answer: "",
  queryType: "text",
  selectedPipeline: "hybrid-multimodal",
  retrieval: "Dense + BM25",
  rerankingEnabled: true,
  confidence: 0.12,
  evidenceStrength: "low",
  evidence: evidenceSets.weak,
  citations: [],
  latencyMs: 1210,
  status: "insufficient_evidence",
  answeredAt: new Date().toISOString(),
});

/**
 * Demo router: maps a question to a canned mock result.
 * Replace with `api.askQuestion()` → real backend when connected.
 */
export function matchQuery(question: string): QueryResult {
  const q = question.toLowerCase().trim();

  if (insufficientTriggers.some((t) => q.includes(t))) return insufficientResult(question);

  for (const c of canned) {
    if (q === c.question.toLowerCase()) return { ...c, question, id: `${c.id}-${Date.now()}` };
  }

  if (/(chart|figure|graph|plot)/.test(q)) return { ...canned[1], question, id: `q-${Date.now()}` };
  if (/(table|column|row|values)/.test(q)) return { ...canned[2], question, id: `q-${Date.now()}` };
  if (/(diagram|architecture|topology|flow)/.test(q))
    return { ...canned[3], question, id: `q-${Date.now()}` };
  if (/(conclusion|conclude|recommend)/.test(q))
    return { ...canned[4], question, id: `q-${Date.now()}` };
  if (/(compare|across|both|difference)/.test(q))
    return { ...canned[5], question, id: `q-${Date.now()}` };
  if (/(summar|finding|about|main)/.test(q)) return { ...canned[0], question, id: `q-${Date.now()}` };

  const g = genericResult();
  return { ...g, question, id: `q-${Date.now()}` };
}
