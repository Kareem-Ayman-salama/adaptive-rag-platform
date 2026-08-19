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
