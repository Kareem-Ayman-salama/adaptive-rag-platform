import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  ArrowRight,
  ArrowDown,
  Upload,
  FileText,
  ScanSearch,
  Route as RouteIcon,
  Eye,
  Table2,
  Layers,
  Database,
  Search,
  Combine,
  Filter,
  Boxes,
  Cpu,
  MessageSquare,
  Quote,
  BadgeCheck,
  Gauge,
  Sparkles,
  CheckCircle2,
  XCircle,
  User,
  BarChart3,
  Workflow,
  GraduationCap,
  ListChecks,
  KeyRound,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { branding, nav } from "../config/branding";
import { Badge, Button, Card, Logo, Reveal, cn } from "../components/ui";

/* ------------------------------ helpers ------------------------------ */

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

function SectionHead({
  kicker,
  title,
  desc,
  align = "center",
}: {
  kicker: string;
  title: ReactNode;
  desc?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "")}>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-acc">{kicker}</p>
      <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">{title}</h2>
      {desc && <p className="mt-4 text-[15px] leading-relaxed text-mut">{desc}</p>}
    </div>
  );
}

function VConn() {
  return <div className="vline mx-auto h-5" aria-hidden="true" />;
}

/* -------------------------------- nav -------------------------------- */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links: Array<{ label: string; id: string }> = [
    { label: "Product", id: "product" },
    { label: "Exams", id: "exams" },
    { label: "Architecture", id: "architecture" },
    { label: "Capabilities", id: "capabilities" },
    { label: "Team", id: "team" },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-line bg-page/85 backdrop-blur-md shadow-[0_8px_30px_-18px_rgba(2,8,20,0.9)]" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">
          <Logo />
        </button>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => scrollTo(l.id)}
              className="rounded-lg px-3 py-2 text-sm text-mut transition-colors hover:text-ink hover:bg-ink/5"
            >
              {l.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button size="sm" className="hidden sm:inline-flex" onClick={() => navigate(nav.documents)}>
            Launch App <ArrowRight className="w-3.5 h-3.5" />
          </Button>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="rounded-lg p-2 text-mut hover:text-ink hover:bg-ink/5 md:hidden"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="anim-rise border-b border-line bg-panel/95 backdrop-blur-md px-4 py-3 md:hidden">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setOpen(false);
                scrollTo(l.id);
              }}
              className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-mut hover:bg-ink/5 hover:text-ink"
            >
              {l.label}
            </button>
          ))}
          <Button className="mt-2 w-full" onClick={() => navigate(nav.documents)}>
            Launch App <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </header>
  );
}

/* ----------------------------- hero visual ---------------------------- */

function PipelineVisual() {
  const branch = ["Text", "Vision", "Table", "Hybrid"];
  const colors = ["var(--acc2)", "var(--vio)", "var(--ok)", "var(--acc)"];
  const nodes: Array<{ icon: ComponentType<{ className?: string }>; label: string; meta: string }> = [
    { icon: Upload, label: "Document Uploaded", meta: "42 pages" },
    { icon: ScanSearch, label: "Document Analyzer", meta: "6 modalities" },
    { icon: RouteIcon, label: "Adaptive Router", meta: "auto-select" },
  ];
  const tail: Array<{ icon: ComponentType<{ className?: string }>; label: string; meta: string }> = [
    { icon: Filter, label: "Retrieval + Reranking", meta: "top-12 → top-4" },
    { icon: Sparkles, label: "Grounded Answer", meta: "confidence 0.93" },
    { icon: BadgeCheck, label: "Evidence", meta: "4 citations" },
  ];

  return (
    <div className="relative">
      <div className="absolute -inset-8 rounded-[28px] bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--acc)_14%,transparent),transparent_65%)]" />
      <Card className="relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">documind · pipeline trace</p>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-ok">
            <span className="w-1.5 h-1.5 rounded-full bg-ok blink" /> live demo
          </span>
        </div>
        <div className="p-5 sm:p-6">
          <div className="space-y-0">
            {nodes.map((n, i) => (
              <div key={n.label}>
                <div
                  className="pipe-node flex items-center justify-between rounded-lg border border-line bg-panel2 px-4 py-3"
                  style={{ animationDelay: `${i * 0.85}s` }}
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-ink">
                    <n.icon className="w-4 h-4 text-acc" /> {n.label}
                  </span>
                  <span className="font-mono text-[11px] text-faint">{n.meta}</span>
                </div>
                <VConn />
              </div>
            ))}

            <div
              className="pipe-node grid grid-cols-4 gap-2 rounded-lg border border-line bg-inset p-2.5"
              style={{ animationDelay: `${3 * 0.85}s` }}
            >
              {branch.map((b, i) => (
                <div
                  key={b}
                  className="flex items-center justify-center rounded-md border px-1 py-2 font-mono text-[11px] font-medium"
                  style={{
                    color: colors[i],
                    borderColor: `color-mix(in oklab, ${colors[i]} 30%, transparent)`,
                    background: `color-mix(in oklab, ${colors[i]} 8%, transparent)`,
                  }}
                >
                  {b}
                </div>
              ))}
            </div>
            <VConn />

            {tail.map((n, i) => (
              <div key={n.label}>
                <div
                  className="pipe-node flex items-center justify-between rounded-lg border border-line bg-panel2 px-4 py-3"
                  style={{ animationDelay: `${(i + 4) * 0.85}s` }}
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-ink">
                    <n.icon className="w-4 h-4 text-acc" /> {n.label}
                  </span>
                  <span className="font-mono text-[11px] text-faint">{n.meta}</span>
                </div>
                {i < tail.length - 1 && <VConn />}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-lg border border-ok/25 bg-ok/5 px-4 py-2.5">
            <span className="font-mono text-[11px] text-ok">evidence strength · high</span>
            <span className="font-mono text-[11px] text-faint">p12·fig3 / p18·tbl4 / p9·c2</span>
          </div>
        </div>
      </Card>

      <div className="floaty absolute -left-10 top-24 hidden xl:flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-2 shadow-xl">
        <Search className="w-3.5 h-3.5 text-acc2" />
        <span className="font-mono text-[11px] text-mut">BM25 + dense</span>
      </div>
      <div className="floaty absolute -right-8 bottom-40 hidden xl:flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-2 shadow-xl" style={{ animationDelay: "1.4s" }}>
        <Filter className="w-3.5 h-3.5 text-vio" />
        <span className="font-mono text-[11px] text-mut">reranker 0.94</span>
      </div>
    </div>
  );
}

function Hero() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40">
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_70%_10%,color-mix(in_oklab,var(--acc2)_12%,transparent),transparent_70%)]" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">
                <Workflow className="w-3.5 h-3.5" /> Adaptive Multimodal RAG
              </Badge>
              <Badge tone="violet">
                <GraduationCap className="w-3.5 h-3.5" /> NEW · Exam Generation
              </Badge>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-5 font-display text-[40px] leading-[1.05] sm:text-6xl font-bold tracking-tight text-ink">
              Understand Documents
              <br />
              Beyond <span className="text-acc">Text.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-mut">
              Adaptive multimodal RAG that understands text, tables, charts, images, diagrams, and
              scanned pages — then answers with <span className="text-ink font-medium">traceable evidence</span>.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => navigate(nav.documents)}>
                Launch Workspace <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollTo("architecture")}>
                Explore Architecture
              </Button>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[12px] text-faint">
              <span><span className="text-acc font-semibold">6</span> content types detected</span>
              <span><span className="text-acc font-semibold">4</span> retrieval pipelines</span>
              <span><span className="text-acc font-semibold">2</span>-stage retrieval + rerank</span>
            </div>
          </Reveal>
        </div>
        <Reveal delay={200}>
          <PipelineVisual />
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------- comparison ----------------------------- */

function Comparison() {
  const weak = [
    "Loses visual information",
    "Poor table understanding",
    "Ignores document structure",
    "One retrieval strategy for everything",
  ];
  const strong = [
    "Preserves tables, figures and layout",
    "Reads charts, diagrams and scanned pages",
    "Structure-aware parent–child chunks",
    "Per-query strategy via adaptive routing",
  ];
  return (
    <section id="product" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHead
            kicker="Why it matters"
            title="Ordinary PDF RAG reads words. This reads the document."
            desc="Flat text extraction throws away most of what makes a document a document. The adaptive pipeline keeps every modality retrievable."
          />
        </Reveal>
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <Card className="h-full p-7 opacity-90">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-mut">Traditional PDF RAG</h3>
                <Badge tone="red">baseline</Badge>
              </div>
              <div className="mt-6 space-y-0 max-w-xs mx-auto lg:mx-0">
                {["PDF", "Extract Text", "Vector Search", "LLM"].map((s, i) => (
                  <div key={s}>
                    <div className="flex items-center gap-2.5 rounded-lg border border-line bg-inset px-4 py-2.5 text-sm text-mut">
                      <span className="font-mono text-[10px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                      {s}
                    </div>
                    {i < 3 && (
                      <div className="flex justify-start pl-6">
                        <ArrowDown className="w-3.5 h-3.5 text-faint" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="fade-rule my-6" />
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">Where it breaks</p>
              <ul className="mt-3 space-y-2.5">
                {weak.map((w) => (
                  <li key={w} className="flex items-start gap-2.5 text-sm text-mut">
                    <XCircle className="mt-0.5 w-4 h-4 shrink-0 text-bad" /> {w}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
          <Reveal delay={120}>
            <Card className="relative h-full overflow-hidden border-acc/30 p-7 shadow-[0_0_60px_-24px_color-mix(in_oklab,var(--acc)_50%,transparent)]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_80%_0%,color-mix(in_oklab,var(--acc)_8%,transparent),transparent_70%)]" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-ink">Adaptive Multimodal RAG</h3>
                  <Badge tone="cyan">{branding.shortName}</Badge>
                </div>
                <div className="mt-6 space-y-0 max-w-sm mx-auto lg:mx-0">
                  {[
                    "PDF",
                    "Document Intelligence",
                    "Content-Type Detection",
                    "Adaptive Routing",
                    "Text / Vision / Table / Hybrid Retrieval",
                    "Reranking",
                    "Grounded Answer + Evidence",
                  ].map((s, i, arr) => (
                    <div key={s}>
                      <div
                        className={cn(
                          "pipe-node flex items-center gap-2.5 rounded-lg border border-line bg-panel2 px-4 py-2.5 text-sm text-ink",
                          i === arr.length - 1 && "border-ok/35 text-ok"
                        )}
                        style={{ animationDelay: `${i * 0.7}s` }}
                      >
                        <span className="font-mono text-[10px] text-acc">{String(i + 1).padStart(2, "0")}</span>
                        {s}
                      </div>
                      {i < arr.length - 1 && (
                        <div className="flex justify-start pl-6">
                          <ArrowDown className="w-3.5 h-3.5 text-acc/70" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="fade-rule my-6" />
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">What you gain</p>
                <ul className="mt-3 space-y-2.5">
                  {strong.map((w) => (
                    <li key={w} className="flex items-start gap-2.5 text-sm text-ink/90">
                      <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-ok" /> {w}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- capabilities ---------------------------- */

function Capabilities() {
  const caps: Array<{
    icon: ComponentType<{ className?: string }>;
    title: string;
    desc: string;
    tag: string;
    color: string;
  }> = [
    { icon: FileText, title: "Text Intelligence", desc: "Semantic text retrieval with document structure awareness and parent–child context.", tag: "dense + sparse", color: "var(--acc2)" },
    { icon: Eye, title: "Vision Intelligence", desc: "Understand diagrams, screenshots, scanned pages, figures and visual content.", tag: "vlm + ocr", color: "var(--vio)" },
    { icon: Table2, title: "Table Intelligence", desc: "Preserve rows, columns, headers and structured relationships across retrieval.", tag: "row / column aware", color: "var(--ok)" },
    { icon: RouteIcon, title: "Automatic Routing", desc: "Automatically choose the appropriate processing and retrieval pipeline per query.", tag: "query analyzer", color: "var(--acc)" },
    { icon: Combine, title: "Hybrid Retrieval", desc: "Combine dense semantic retrieval with BM25 keyword search, then fuse the results.", tag: "rrf fusion", color: "var(--acc2)" },
    { icon: Filter, title: "Reranking", desc: "Re-score candidate evidence with a cross-encoder before anything is generated.", tag: "top-12 → top-4", color: "var(--vio)" },
    { icon: BadgeCheck, title: "Evidence Grounding", desc: "Every answer points back to ranked source evidence with page-level citations.", tag: "citations on", color: "var(--ok)" },
    { icon: Gauge, title: "Evaluation", desc: "Track retrieval quality, answer quality, citation accuracy and latency end-to-end.", tag: "ragas-style", color: "var(--warn)" },
  ];
  return (
    <section id="capabilities" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHead
            kicker="Capabilities"
            title="Eight subsystems. One adaptive pipeline."
            desc="Each capability is a real stage in the retrieval flow — not a marketing bullet."
          />
        </Reveal>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {caps.map((c, i) => (
            <Reveal key={c.title} delay={(i % 4) * 80}>
              <Card hover className="group h-full p-6">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-110"
                  style={{
                    color: c.color,
                    borderColor: `color-mix(in oklab, ${c.color} 30%, transparent)`,
                    background: `color-mix(in oklab, ${c.color} 10%, transparent)`,
                  }}
                >
                  <c.icon className="w-[18px] h-[18px]" />
                </div>
                <h3 className="mt-4 font-display text-[15px] font-semibold text-ink">{c.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-mut">{c.desc}</p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: c.color }}>
                  {c.tag}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- exam studio ----------------------------- */

function ExamSection() {
  const navigate = useNavigate();
  const bullets = [
    { icon: GraduationCap, title: "Built for educators", desc: "Professors, TAs, trainers — anyone turning a source into an exam.", color: "var(--vio)" },
    { icon: ListChecks, title: "Mixed question formats", desc: "MCQ, true/false and short answer, drafted from indexed evidence.", color: "var(--acc2)" },
    { icon: KeyRound, title: "Answer key included", desc: "Every answer is grounded to the exact page and section it came from.", color: "var(--ok)" },
    { icon: SlidersHorizontal, title: "You stay in control", desc: "Set difficulty, question count, formats and an optional topic focus.", color: "var(--acc)" },
  ];
  return (
    <section id="exams" className="relative py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_20%_40%,color-mix(in_oklab,var(--vio)_8%,transparent),transparent_70%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vio">New · Exam Intelligence</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
              Turn any source into a <span className="text-vio">ready exam.</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-mut">
              The same document intelligence that answers questions can also <span className="text-ink font-medium">write the exam</span>.
              Point it at a lecture, a paper, or a manual — get questions with a grounded answer key, not guesswork.
            </p>
          </Reveal>
          <div className="mt-8 space-y-5">
            {bullets.map((b, i) => (
              <Reveal key={b.title} delay={i * 90}>
                <div className="flex items-start gap-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
                    style={{
                      color: b.color,
                      borderColor: `color-mix(in oklab, ${b.color} 30%, transparent)`,
                      background: `color-mix(in oklab, ${b.color} 10%, transparent)`,
                    }}
                  >
                    <b.icon className="w-[18px] h-[18px]" />
                  </span>
                  <div>
                    <h3 className="font-display text-[15px] font-semibold text-ink">{b.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-mut">{b.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={360}>
            <div className="mt-9">
              <Button size="lg" onClick={() => navigate(nav.exams)}>
                Open Exam Studio <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[28px] bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--vio)_12%,transparent),transparent_65%)]" />
            <Card className="relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">exam-studio · generated</p>
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-ok">
                  <KeyRound className="w-3 h-3" /> key grounded
                </span>
              </div>
              <div className="space-y-4 p-5">
                <div className="flex flex-wrap gap-1.5">
                  {["8 questions", "MCQ + True/False", "Medium"].map((c) => (
                    <span key={c} className="rounded-md border border-line bg-inset px-2 py-1 font-mono text-[10px] text-faint">{c}</span>
                  ))}
                </div>

                <div className="rounded-lg border border-line bg-panel2/60 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-vio">Q1 · Multiple choice</p>
                  <p className="mt-2 text-[13px] font-medium text-ink">
                    Which retrieval configuration sustained the highest throughput under the 200 ms budget?
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {["Keyword-only search", "Adaptive hybrid pipeline", "Text-only dense retrieval"].map((o, i) => (
                      <div
                        key={o}
                        className={cn(
                          "flex items-center justify-between rounded-md border px-3 py-1.5 text-[12px]",
                          i === 1 ? "border-ok/40 bg-ok/5 text-ink" : "border-line bg-inset text-mut"
                        )}
                      >
                        <span>
                          <span className="mr-2 font-mono text-[10px] text-faint">{String.fromCharCode(65 + i)}</span>
                          {o}
                        </span>
                        {i === 1 && <Check className="w-3.5 h-3.5 text-ok" />}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2.5 font-mono text-[10px] text-faint">src · Page 12 · Figure 3</p>
                </div>

                <div className="rounded-lg border border-line bg-panel2/60 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-vio">Q2 · True / false</p>
                  <p className="mt-2 text-[13px] font-medium text-ink">
                    Table-aware parsing preserves header relationships lost by flat text extraction.
                  </p>
                  <div className="mt-3 flex gap-1.5">
                    <span className="flex items-center gap-1.5 rounded-md border border-ok/40 bg-ok/5 px-3 py-1.5 text-[12px] text-ink">
                      True <Check className="w-3 h-3 text-ok" />
                    </span>
                    <span className="rounded-md border border-line bg-inset px-3 py-1.5 text-[12px] text-mut">False</span>
                  </div>
                  <p className="mt-2.5 font-mono text-[10px] text-faint">src · Page 18 · Table 4</p>
                </div>
              </div>
            </Card>
            <div className="floaty absolute -right-6 top-16 hidden xl:flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-2 shadow-xl">
              <GraduationCap className="w-3.5 h-3.5 text-vio" />
              <span className="font-mono text-[11px] text-mut">for educators</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------- team -------------------------------- */

function TeamSection() {
  const members = [
    { name: "Kareem Ayman", initials: "KA", from: "var(--acc2)", to: "var(--acc)" },
    { name: "Jana Ashraf", initials: "JA", from: "var(--vio)", to: "var(--acc2)" },
    { name: "Sama Hany", initials: "SH", from: "var(--ok)", to: "var(--acc)" },
    { name: "Sara Elsafty", initials: "SE", from: "var(--warn)", to: "var(--vio)" },
    { name: "Nadin Farid", initials: "NF", from: "var(--bad)", to: "var(--warn)" },
  ];
  return (
    <section id="team" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHead
            kicker="The builders"
            title={
              <>
                Team <span className="text-acc">Kemet AI</span>
              </>
            }
            desc="Named after Kemet — the ancient name of Egypt, the black land. We build document intelligence for the next era of knowledge."
          />
        </Reveal>
        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {members.map((m, i) => (
            <Reveal
              key={m.name}
              delay={i * 90}
              className={cn(i === members.length - 1 && "col-span-2 sm:col-span-1")}
            >
              <Card hover className="group relative overflow-hidden p-6 text-center">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.08] transition-opacity duration-300 group-hover:opacity-[0.16]"
                  style={{ background: m.from }}
                />
                <div className="relative mx-auto w-fit rounded-2xl border border-line2 p-1.5 transition-transform duration-300 group-hover:-rotate-2 group-hover:scale-105">
                  <span
                    className="flex h-16 w-16 items-center justify-center rounded-xl font-display text-xl font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${m.from}, ${m.to})` }}
                  >
                    {m.initials}
                  </span>
                </div>
                <p className="mt-4 font-display text-[15px] font-semibold text-ink">{m.name}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Kemet AI</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- architecture ---------------------------- */

function ArchNode({
  icon: Icon,
  title,
  sub,
  accent,
  delay = 0,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  sub?: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className="w-full max-w-md">
      <div
        className="pipe-node flex items-center gap-3.5 rounded-xl border border-line bg-panel2 px-5 py-3.5"
        style={{ animationDelay: `${delay / 1000}s` }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
          style={{
            color: accent ?? "var(--acc)",
            borderColor: `color-mix(in oklab, ${accent ?? "var(--acc)"} 30%, transparent)`,
            background: `color-mix(in oklab, ${accent ?? "var(--acc)"} 10%, transparent)`,
          }}
        >
          <Icon className="w-4 h-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          {sub && <span className="block truncate font-mono text-[11px] text-faint">{sub}</span>}
        </span>
      </div>
    </Reveal>
  );
}

function Architecture() {
  const pipelines = [
    { icon: FileText, label: "Text Pipeline", color: "var(--acc2)", sub: "semantic chunks" },
    { icon: Eye, label: "Vision Pipeline", color: "var(--vio)", sub: "figures · ocr" },
    { icon: Table2, label: "Table / Chart", color: "var(--ok)", sub: "structured" },
  ];
  return (
    <section id="architecture" className="relative py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_30%,color-mix(in_oklab,var(--acc2)_7%,transparent),transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHead
            kicker="System architecture"
            title="From upload to verifiable answer"
            desc="Every stage below is represented in the product UI — the workspace shows routing, the assistant shows retrieval, the dashboard shows evaluation."
          />
        </Reveal>
        <Reveal delay={120}>
          <Card className="relative mx-auto mt-14 max-w-4xl overflow-hidden p-6 sm:p-10">
            <div className="bg-grid absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative flex flex-col items-center">
              <ArchNode icon={User} title="User" sub="upload · question" accent="var(--acc2)" />
              <VConn />
              <ArchNode icon={ScanSearch} title="Document / Query Analyzer" sub="modality detection · intent classification" delay={60} />
              <VConn />
              <ArchNode icon={RouteIcon} title="Adaptive Router" sub="selects pipeline per content type" accent="var(--warn)" delay={120} />
              <VConn />

              <Reveal delay={160} className="w-full max-w-2xl">
                <div className="rounded-xl border border-line bg-inset p-3">
                  <p className="mb-2.5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                    modality pipelines
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {pipelines.map((p) => (
                      <div
                        key={p.label}
                        className="pipe-node flex flex-col items-center gap-1.5 rounded-lg border border-line bg-panel2 px-3 py-4"
                      >
                        <p.icon className="w-5 h-5" style={{ color: p.color }} />
                        <span className="text-[13px] font-semibold text-ink">{p.label}</span>
                        <span className="font-mono text-[10px] text-faint">{p.sub}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
              <VConn />

              <ArchNode icon={Database} title="Multimodal Index" sub="text · vision · table embeddings" delay={200} />
              <VConn />
              <ArchNode icon={Search} title="Dense + Sparse Retrieval" sub="semantic search + BM25" accent="var(--acc2)" delay={240} />
              <VConn />
              <ArchNode icon={Combine} title="Hybrid Fusion" sub="reciprocal rank fusion" delay={280} />
              <VConn />
              <ArchNode icon={Filter} title="Reranking" sub="cross-encoder re-scoring" accent="var(--vio)" delay={320} />
              <VConn />
              <ArchNode icon={Boxes} title="Context Builder" sub="parent–child context assembly" delay={360} />
              <VConn />
              <ArchNode icon={Cpu} title="LLM / VLM" sub="grounded generation · citations enforced" accent="var(--warn)" delay={400} />
              <VConn />

              <Reveal delay={440} className="w-full max-w-2xl">
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { icon: MessageSquare, label: "Answer", color: "var(--acc)" },
                    { icon: Quote, label: "Citations", color: "var(--acc2)" },
                    { icon: BadgeCheck, label: "Evidence", color: "var(--ok)" },
                  ].map((o) => (
                    <div key={o.label} className="flex items-center justify-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-3">
                      <o.icon className="w-4 h-4" style={{ color: o.color }} />
                      <span className="text-[13px] font-semibold text-ink">{o.label}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
              <VConn />
              <ArchNode icon={BarChart3} title="Evaluation Dashboard" sub="hit rate · faithfulness · latency" accent="var(--ok)" delay={480} />
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------- how it works ---------------------------- */

function HowItWorks() {
  const steps: Array<{ icon: ComponentType<{ className?: string }>; title: string; desc: string; chips?: string[] }> = [
    { icon: Upload, title: "Upload", desc: "Drop in a PDF — scanned, digital, or mixed." },
    { icon: ScanSearch, title: "Analyze", desc: "The system detects every content type present.", chips: ["text", "images", "tables", "charts", "diagrams", "scanned"] },
    { icon: RouteIcon, title: "Route", desc: "The router selects the right pipeline automatically.", chips: ["Text RAG", "Vision RAG", "Table", "Hybrid"] },
    { icon: Search, title: "Retrieve", desc: "Semantic + keyword retrieval finds candidate evidence." },
    { icon: Filter, title: "Rerank", desc: "A cross-encoder re-scores evidence before generation." },
    { icon: Sparkles, title: "Generate", desc: "A grounded answer is written from retrieved context only." },
    { icon: BadgeCheck, title: "Verify", desc: "Sources, pages and ranked evidence are displayed." },
  ];
  return (
    <section id="how" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHead
            kicker="How it works"
            title="Seven stages, fully visible"
            desc="The demo walks this exact path — every stage has a surface in the UI."
          />
        </Reveal>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={(i % 4) * 90}>
              <div className="group relative h-full rounded-xl border border-line bg-panel p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-line2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-bold text-acc/80">{String(i + 1).padStart(2, "0")}</span>
                  <s.icon className="w-4 h-4 text-faint transition-colors group-hover:text-acc" />
                </div>
                <h3 className="mt-4 font-display text-[15px] font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-mut">{s.desc}</p>
                {s.chips && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.chips.map((c) => (
                      <span key={c} className="rounded border border-line bg-inset px-1.5 py-0.5 font-mono text-[10px] text-faint">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          ))}
          <Reveal delay={270}>
            <div className="flex h-full flex-col items-start justify-center rounded-xl border border-dashed border-acc/30 bg-acc/5 p-6">
              <Layers className="w-5 h-5 text-acc" />
              <p className="mt-3 font-display text-[15px] font-semibold text-ink">See it live</p>
              <p className="mt-1.5 text-[13px] text-mut">The workspace runs all seven stages on mock data.</p>
              <button
                onClick={() => scrollTo("demo")}
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-acc hover:gap-2.5 transition-all"
              >
                Jump to demo <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- CTA --------------------------------- */

function DemoCta() {
  const navigate = useNavigate();
  return (
    <section id="demo" className="relative py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-acc/25 bg-panel px-6 py-16 text-center sm:px-16">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,color-mix(in_oklab,var(--acc)_16%,transparent),transparent_70%)]" />
            <div className="bg-grid absolute inset-0 opacity-50" />
            <div className="relative">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-acc">hackathon demo</p>
              <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl sm:text-5xl font-bold tracking-tight text-ink">
                Don't Just Chat With Documents. <span className="text-acc">Understand Them.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[15px] text-mut">
                Upload a sample PDF, watch the router pick a pipeline, and inspect the evidence
                behind every answer.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" onClick={() => navigate(nav.documents)}>
                  Launch Document Intelligence <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate(nav.analytics)}>
                  View Analytics
                </Button>
              </div>
              <p className="mt-6 font-mono text-[11px] text-faint">runs fully in the browser · no backend required</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------- footer ------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-line py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-[13px] leading-relaxed text-mut">{branding.description}</p>
            <p className="mt-4 font-mono text-[11px] text-faint">{branding.tagline}</p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">Product</p>
              <div className="mt-3 space-y-2">
                {[
                  { label: "Capabilities", id: "capabilities" },
                  { label: "Architecture", id: "architecture" },
                  { label: "How it works", id: "how" },
                ].map((l) => (
                  <button key={l.id} onClick={() => scrollTo(l.id)} className="block text-[13px] text-mut hover:text-ink transition-colors">
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">App</p>
              <div className="mt-3 space-y-2">
                {[
                  { label: "Workspace", to: nav.documents },
                  { label: "Analytics", to: nav.analytics },
                ].map((l) => (
                  <a key={l.to} href={`#${l.to}`} className="block text-[13px] text-mut hover:text-ink transition-colors">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">Status</p>
              <div className="mt-3">
                <Badge tone="amber">Demo · mock data</Badge>
                <p className="mt-2 font-mono text-[11px] text-faint">{branding.version}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="fade-rule mt-10" />
        <div className="mt-6 space-y-2 text-center">
          <p className="font-mono text-[11px] text-faint">
            © 2025 {branding.name} — built for the Advanced Multimodal RAG Hackathon. All metrics shown are sample data.
          </p>
          <p className="font-mono text-[11px] text-mut">
            Crafted by <span className="font-semibold text-acc">Team Kemet AI</span> — Kareem Ayman · Jana Ashraf · Sama Hany · Sara Elsafty · Nadin Farid
          </p>
        </div>
      </div>
    </footer>
  );
}

/* --------------------------------- page -------------------------------- */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-page text-ink">
      <Nav />
      <Hero />
      <Comparison />
      <ExamSection />
      <Capabilities />
      <Architecture />
      <HowItWorks />
      <DemoCta />
      <TeamSection />
      <Footer />
    </div>
  );
}
