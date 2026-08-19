import type { ExamConfig, ExamQuestion, ExamQuestionType } from "../types";

/**
 * Mock exam question banks — questions are "drafted from" each document's
 * indexed evidence. Replace with real generation once the backend is live.
 */

const q = (
  type: ExamQuestionType,
  prompt: string,
  answer: string,
  source: { page: number; section: string },
  difficulty: ExamQuestion["difficulty"],
  over?: Partial<ExamQuestion>
): Omit<ExamQuestion, "id" | "index"> => ({
  type,
  prompt,
  answer,
  source,
  difficulty,
  ...over,
});

const researchBank: Array<Omit<ExamQuestion, "id" | "index">> = [
  q(
    "mcq",
    "Which retrieval configuration sustained the highest throughput before crossing the 200 ms p95 latency budget?",
    "Adaptive hybrid pipeline",
    { page: 12, section: "Figure 3" },
    "medium",
    {
      options: [
        "Keyword-only search",
        "Adaptive hybrid pipeline",
        "Text-only dense retrieval",
        "Naive fixed-size chunking",
      ],
      correctIndex: 1,
      explanation:
        "Figure 3 shows the adaptive hybrid crossing the 200 ms p95 budget near 40 qps, versus ~25 qps for text-only.",
    }
  ),
  q(
    "mcq",
    "By how much did structure-aware chunking lift retrieval hit rate over naive chunking?",
    "11–14%",
    { page: 9, section: "Section 3.1 · Results" },
    "easy",
    {
      options: ["2–4%", "6–8%", "11–14%", "20–25%"],
      correctIndex: 2,
      explanation: "The results section reports an 11–14% hit-rate gain across all evaluated benchmarks.",
    }
  ),
  q(
    "mcq",
    "What does the router use to update its routing priors over time?",
    "Retrieval outcomes from prior queries",
    { page: 24, section: "Section 4.3 · Router feedback" },
    "medium",
    {
      options: [
        "Manual user ratings",
        "Retrieval outcomes from prior queries",
        "Document file size",
        "Random re-sampling",
      ],
      correctIndex: 1,
      explanation: "A feedback edge from the evaluator feeds retrieval outcomes back into the router.",
    }
  ),
  q(
    "mcq",
    "In Table 4, what end-to-end latency does the adaptive multimodal system report?",
    "1.9 s",
    { page: 18, section: "Table 4" },
    "easy",
    {
      options: ["1.2 s", "1.9 s", "2.4 s", "3.1 s"],
      correctIndex: 1,
      explanation: "Table 4 lists 1.9 s for the adaptive system against 2.4 s for the strongest baseline.",
    }
  ),
  q(
    "mcq",
    "Which factor does Section 4.2 attribute most of the latency improvement to?",
    "Routing, not the index itself",
    { page: 15, section: "Section 4.2 · Routing analysis" },
    "hard",
    {
      options: [
        "Larger index shards",
        "Routing, not the index itself",
        "GPU batching",
        "Response caching",
      ],
      correctIndex: 1,
      explanation: "The routing analysis isolates pipeline selection as the dominant latency factor.",
    }
  ),
  q(
    "mcq",
    "What is the recommended default pipeline for mixed-modality documents?",
    "Hybrid multimodal retrieval",
    { page: 42, section: "Section 6 · Conclusion" },
    "easy",
    {
      options: [
        "Text-only RAG",
        "Keyword-only search",
        "Hybrid multimodal retrieval",
        "Vision-only RAG",
      ],
      correctIndex: 2,
      explanation: "The conclusion recommends hybrid multimodal retrieval as the default for mixed content.",
    }
  ),
  q(
    "truefalse",
    "Table-aware parsing preserves header relationships that flat text extraction loses.",
    "True",
    { page: 18, section: "Table 4" },
    "easy",
    {
      options: ["True", "False"],
      correctIndex: 0,
      explanation: "The report credits preserved row/column/header structure for better faithfulness on numeric questions.",
    }
  ),
  q(
    "truefalse",
    "A single retrieval strategy performs equally well across heterogeneous documents.",
    "False",
    { page: 42, section: "Section 6 · Conclusion" },
    "medium",
    {
      options: ["True", "False"],
      correctIndex: 1,
      explanation: "The central finding is that no single strategy suffices — routing by content type matters.",
    }
  ),
  q(
    "truefalse",
    "The report treats evidence grounding as an optional display feature.",
    "False",
    { page: 40, section: "Section 5.2 · Limitations" },
    "medium",
    {
      options: ["True", "False"],
      correctIndex: 1,
      explanation: "Grounding is treated as a hard requirement: answers without retrievable support are withheld.",
    }
  ),
  q(
    "short",
    "Explain what the feedback edge from the evaluator to the router achieves.",
    "It updates routing priors using retrieval outcomes from prior queries, improving pipeline selection over time.",
    { page: 24, section: "Section 4.3 · Router feedback" },
    "hard",
    { explanation: "See the router feedback loop in the system diagram on page 21 and its analysis on page 24." }
  ),
  q(
    "short",
    "Why do the authors describe the chunking and routing gains as complementary?",
    "Better chunks improve what is retrievable, while better routing improves which pipeline retrieves it.",
    { page: 15, section: "Section 4.2 · Routing analysis" },
    "medium"
  ),
  q(
    "short",
    "State the service-level latency target defined for interactive queries.",
    "200 ms at p95.",
    { page: 7, section: "Section 2.4 · Evaluation design" },
    "easy"
  ),
  q(
    "mcq",
    "Which fusion method merges the dense and sparse retrieval lists?",
    "Reciprocal rank fusion",
    { page: 21, section: "Figure 5" },
    "medium",
    {
      options: ["Round-robin merge", "Reciprocal rank fusion", "Score averaging", "Longest-list wins"],
      correctIndex: 1,
      explanation: "The system diagram labels the fusion layer as reciprocal rank fusion.",
    }
  ),
  q(
    "mcq",
    "How many candidate passages does the reranker re-score before generation?",
    "Top-12 down to top-4",
    { page: 21, section: "Figure 5" },
    "easy",
    {
      options: ["Top-5 down to top-2", "Top-12 down to top-4", "Top-50 down to top-10", "All candidates"],
      correctIndex: 1,
      explanation: "The pipeline description states a top-12 → top-4 reranking stage.",
    }
  ),
  q(
    "mcq",
    "According to Table 1, what share of the evaluated corpus is table-heavy?",
    "22%",
    { page: 5, section: "Table 1" },
    "easy",
    {
      options: ["12%", "20%", "22%", "58%"],
      correctIndex: 2,
      explanation: "Table 1 reports 58% text-heavy, 22% table-heavy and 20% visual documents.",
    }
  ),
  q(
    "mcq",
    "At what document scale does Figure 8 replicate the ordering seen in Figure 3?",
    "4× the original volume",
    { page: 36, section: "Figure 8" },
    "medium",
    {
      options: ["2× the original volume", "4× the original volume", "10× the original volume", "The same volume"],
      correctIndex: 1,
      explanation: "Figure 8 repeats the experiment at 4× document volume with the same pipeline ordering.",
    }
  ),
  q(
    "mcq",
    "What does the context builder assemble before generation?",
    "Parent–child context around each retrieved chunk",
    { page: 21, section: "Figure 5" },
    "medium",
    {
      options: [
        "A summary of the whole document",
        "Parent–child context around each retrieved chunk",
        "A list of keywords",
        "The raw PDF pages",
      ],
      correctIndex: 1,
      explanation: "The context builder stage is described as parent–child context assembly.",
    }
  ),
  q(
    "mcq",
    "Which index is responsible for figures, diagrams and OCR content?",
    "The vision index",
    { page: 21, section: "Figure 5" },
    "easy",
    {
      options: ["The sparse index", "The vision index", "The table index", "The keyword cache"],
      correctIndex: 1,
      explanation: "The vision pipeline feeds figures, diagrams and scanned pages into the vision index.",
    }
  ),
  q(
    "truefalse",
    "BM25 sparse search is one of the two signals used in hybrid retrieval.",
    "True",
    { page: 21, section: "Figure 5" },
    "easy",
    {
      options: ["True", "False"],
      correctIndex: 0,
      explanation: "Hybrid retrieval fuses dense semantic search with BM25 keyword search.",
    }
  ),
  q(
    "truefalse",
    "Reranking happens after fusion and before generation.",
    "True",
    { page: 21, section: "Figure 5" },
    "medium",
    {
      options: ["True", "False"],
      correctIndex: 0,
      explanation: "The flow is fusion → rerank → context builder → generation.",
    }
  ),
  q(
    "truefalse",
    "The 200 ms p95 budget applies to offline batch indexing.",
    "False",
    { page: 7, section: "Section 2.4 · Evaluation design" },
    "hard",
    {
      options: ["True", "False"],
      correctIndex: 1,
      explanation: "The budget is defined for interactive queries, not for offline indexing.",
    }
  ),
  q(
    "short",
    "Name the three modality pipelines shown in the system diagram.",
    "Text pipeline, vision pipeline, and table/chart pipeline.",
    { page: 21, section: "Figure 5" },
    "easy"
  ),
  q(
    "short",
    "Which two search signals does the fusion layer combine?",
    "Dense semantic search and BM25 keyword (sparse) search.",
    { page: 21, section: "Figure 5" },
    "medium"
  ),
  q(
    "short",
    "Summarize the corpus composition reported in Table 1.",
    "1.2k mixed-modality documents: 58% text-heavy, 22% table-heavy and 20% visual.",
    { page: 5, section: "Table 1" },
    "medium"
  ),
];

const fallbackBank: Array<Omit<ExamQuestion, "id" | "index">> = [
  q(
    "mcq",
    "According to the document, which category accounts for the largest share of the reported totals?",
    "Operating costs",
    { page: 8, section: "Section 3 · Figures" },
    "medium",
    {
      options: ["Operating costs", "Capital investments", "One-time items", "Reserved funds"],
      correctIndex: 0,
      explanation: "The figures section breaks down totals with operating costs as the dominant category.",
    }
  ),
  q(
    "mcq",
    "Which statement best captures the document's primary recommendation?",
    "Adopt the phased approach outlined in the closing section",
    { page: 26, section: "Section 6 · Recommendations" },
    "medium",
    {
      options: [
        "Adopt the phased approach outlined in the closing section",
        "Maintain the current process unchanged",
        "Outsource the entire workflow",
        "Delay the decision pending further data",
      ],
      correctIndex: 0,
      explanation: "The recommendations section closes with a phased adoption plan.",
    }
  ),
  q(
    "truefalse",
    "The document states its conclusions apply only within the evaluated scope.",
    "True",
    { page: 24, section: "Section 5 · Limitations" },
    "easy",
    {
      options: ["True", "False"],
      correctIndex: 0,
      explanation: "The limitations section scopes all claims to the evaluated corpus.",
    }
  ),
  q(
    "truefalse",
    "Every figure referenced in the text is listed in the appendix index.",
    "True",
    { page: 30, section: "Appendix A" },
    "easy",
    {
      options: ["True", "False"],
      correctIndex: 0,
      explanation: "Appendix A indexes all figures referenced throughout the document.",
    }
  ),
  q(
    "short",
    "Summarize the key trade-off discussed in the methodology section.",
    "Higher coverage comes at the cost of additional processing time; the document recommends budgeting for it explicitly.",
    { page: 5, section: "Section 2 · Methodology" },
    "medium"
  ),
  q(
    "short",
    "What condition does the document give for revisiting its main recommendation?",
    "If the underlying assumptions in Section 2 change materially, the recommendation should be re-evaluated.",
    { page: 26, section: "Section 6 · Recommendations" },
    "hard"
  ),
  q(
    "mcq",
    "Which section defines the scope of the evaluation?",
    "Section 2 · Methodology",
    { page: 5, section: "Section 2 · Methodology" },
    "easy",
    {
      options: ["Section 1 · Overview", "Section 2 · Methodology", "Section 4 · Findings", "Section 6 · Recommendations"],
      correctIndex: 1,
      explanation: "The methodology section sets the evaluation scope and constraints.",
    }
  ),
  q(
    "mcq",
    "Which appendix indexes every figure referenced in the main text?",
    "Appendix A",
    { page: 30, section: "Appendix A" },
    "easy",
    {
      options: ["Appendix A", "Appendix B", "Appendix C", "There is no figure index"],
      correctIndex: 0,
      explanation: "Appendix A is the figure index referenced throughout the document.",
    }
  ),
  q(
    "mcq",
    "What review cadence do the recommendations propose?",
    "A quarterly review",
    { page: 26, section: "Section 6 · Recommendations" },
    "medium",
    {
      options: ["A weekly review", "A monthly review", "A quarterly review", "An annual review"],
      correctIndex: 2,
      explanation: "The closing section proposes a quarterly review cycle.",
    }
  ),
  q(
    "mcq",
    "Which instrument does the methodology describe for primary data collection?",
    "A structured survey",
    { page: 5, section: "Section 2 · Methodology" },
    "medium",
    {
      options: ["Open interviews", "A structured survey", "Sensor telemetry", "Public datasets only"],
      correctIndex: 1,
      explanation: "Primary data is collected via a structured survey as described in Section 2.",
    }
  ),
  q(
    "mcq",
    "Which segment shows the highest reported margin in the breakdown table?",
    "The enterprise segment",
    { page: 14, section: "Table 3" },
    "hard",
    {
      options: ["The consumer segment", "The SMB segment", "The enterprise segment", "All segments are equal"],
      correctIndex: 2,
      explanation: "Table 3 lists the enterprise segment with the highest margin row.",
    }
  ),
  q(
    "mcq",
    "What does the closing chart compare?",
    "Projected versus actual totals across three quarters",
    { page: 22, section: "Figure 6" },
    "medium",
    {
      options: [
        "Projected versus actual totals across three quarters",
        "Headcount by department",
        "Vendor pricing tiers",
        "Regional distribution only",
      ],
      correctIndex: 0,
      explanation: "Figure 6 plots projected against actual totals for Q1–Q3.",
    }
  ),
  q(
    "truefalse",
    "The limitations section scopes all claims to the evaluated corpus.",
    "True",
    { page: 24, section: "Section 5 · Limitations" },
    "easy",
    {
      options: ["True", "False"],
      correctIndex: 0,
      explanation: "Section 5 explicitly limits the claims to the evaluated corpus.",
    }
  ),
  q(
    "truefalse",
    "The recommendations section appears before the methodology.",
    "False",
    { page: 26, section: "Section 6 · Recommendations" },
    "easy",
    {
      options: ["True", "False"],
      correctIndex: 1,
      explanation: "Methodology (Section 2) precedes recommendations (Section 6).",
    }
  ),
  q(
    "truefalse",
    "Figure 6 includes a projection line for the next quarter.",
    "False",
    { page: 22, section: "Figure 6" },
    "hard",
    {
      options: ["True", "False"],
      correctIndex: 1,
      explanation: "Figure 6 covers Q1–Q3 only; no forward projection line is drawn.",
    }
  ),
  q(
    "short",
    "List the three phases of the recommended adoption plan.",
    "Pilot, scale, and optimize.",
    { page: 26, section: "Section 6 · Recommendations" },
    "medium"
  ),
  q(
    "short",
    "What does the sampling approach described in the methodology aim to balance?",
    "Representation across segments while keeping the survey cost bounded.",
    { page: 5, section: "Section 2 · Methodology" },
    "medium"
  ),
  q(
    "short",
    "According to Table 3, which cost category grew fastest quarter over quarter?",
    "Operating costs, driven by the enterprise segment.",
    { page: 14, section: "Table 3" },
    "hard"
  ),
];

/** Selects and orders questions per config: preferred difficulty first,
 *  round-robin across the requested formats. */
export function pickQuestions(config: ExamConfig, docName: string) {
  void docName;
  const bank = config.documentId === "ai-research-report" ? researchBank : fallbackBank;
  const types = config.types.length > 0 ? config.types : (["mcq"] as ExamQuestionType[]);
  const pools = types.map((t) => {
    const of = bank.filter((x) => x.type === t);
    return [
      ...of.filter((x) => x.difficulty === config.difficulty),
      ...of.filter((x) => x.difficulty !== config.difficulty),
    ];
  });

  const out: Array<Omit<ExamQuestion, "id" | "index">> = [];
  let cursor = 0;
  let guard = 0;
  while (out.length < config.count && guard < 200) {
    guard++;
    const pool = pools[cursor % pools.length];
    const next = pool.shift();
    cursor++;
    if (!next) {
      if (pools.every((p) => p.length === 0)) break;
      continue;
    }
    out.push(next);
  }

  const stamp = Date.now().toString(36);
  return out.map((x, i) => ({
    ...x,
    id: `xq-${stamp}-${i}`,
    index: i + 1,
  }));
}
