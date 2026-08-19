import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ShieldX,
  PanelBottom,
  X,
  FileText,
  Sparkles,
  Timer,
  Zap,
  Filter,
  Route as RouteIcon,
  Search,
  AlertTriangle,
  Mic,
  Paperclip,
  ArrowLeftRight,
} from "lucide-react";
import { api } from "../services/api";
import { nav } from "../config/branding";
import { matchQuery, suggestedQuestions } from "../mock/queries";
import type { ChatMessage, Document, Evidence, QueryResult, RetrievalStageState } from "../types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LogoMark,
  Modal,
  PipelineBadge,
  QueryTypeBadge,
  Skeleton,
  Tip,
  cn,
  formatMs,
  toast,
} from "../components/ui";
import UploadZone from "../components/documents/UploadZone";
import { EvidenceCard, EvidenceListSkeleton, EvidencePreviewModal } from "../components/assistant/EvidencePanel";

const STAGE_LABELS = [
  "Analyzing question...",
  "Selecting retrieval strategy...",
  "Searching semantic index...",
  "Searching keyword index · BM25...",
  "Reranking evidence...",
  "Building context...",
  "Generating grounded answer...",
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* --------------------------- answer + citations --------------------------- */

function AnswerText({ text, onCite }: { text: string; onCite: (label: string) => void }) {
  const parts = text.split(/(\[Page[^\]]*\])/g);
  return (
    <p className="text-[14px] leading-[1.75] text-ink/90">
      {parts.map((p, i) =>
        p.startsWith("[Page") ? (
          <button
            key={i}
            onClick={() => onCite(p.slice(1, -1))}
            className="mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-md border border-acc/35 bg-acc/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-acc transition-all hover:border-acc/60 hover:bg-acc/20"
            title="Jump to source evidence"
          >
            {p.slice(1, -1)}
          </button>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </p>
  );
}

function AnalysisStrip({ result, adaptiveOn }: { result: QueryResult; adaptiveOn: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <QueryTypeBadge type={result.queryType} />
      <PipelineBadge pipeline={result.selectedPipeline} size="sm" />
      <Badge tone="neutral">{result.retrieval}</Badge>
      <Badge tone={result.rerankingEnabled ? "violet" : "neutral"}>
        <Filter className="w-3 h-3" /> RERANK {result.rerankingEnabled ? "ON" : "OFF"}
      </Badge>
      {!adaptiveOn && <Badge tone="amber">ADAPTIVE OFF · FIXED PIPELINE</Badge>}
      <span className="ml-auto flex items-center gap-3 font-mono text-[11px] text-faint">
        <span className="inline-flex items-center gap-1"><Timer className="w-3 h-3" />{formatMs(result.latencyMs)}</span>
        <span className="inline-flex items-center gap-1"><Zap className="w-3 h-3" />conf {(result.confidence * 100).toFixed(0)}%</span>
      </span>
    </div>
  );
}

function InsufficientCard({ result }: { result: QueryResult }) {
  return (
    <div className="rounded-xl border border-warn/30 bg-warn/5 p-5">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-warn/30 bg-warn/10">
          <ShieldX className="w-5 h-5 text-warn" />
        </span>
        <div>
          <h4 className="font-display text-base font-semibold text-ink">Insufficient Evidence</h4>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-mut">
            {result.answer ||
              "The retrieved document evidence does not provide enough information to answer this question reliably. Rather than guess, the system withholds an answer."}
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <Badge tone="red">EVIDENCE STRENGTH · LOW</Badge>
            <Badge tone="amber">ANSWER GENERATION BLOCKED</Badge>
            <Badge tone="green">
              <ShieldCheck className="w-3 h-3" /> NO FABRICATED ANSWER
            </Badge>
          </div>
          <p className="mt-3 font-mono text-[11px] text-faint">
            top retrieval score {(result.evidence[0]?.retrievalScore.toFixed(2) ?? "0.24")} · below grounding
            threshold 0.55
          </p>
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({
  result,
  adaptiveOn,
  activeEvidenceId,
  onCite,
}: {
  result: QueryResult;
  adaptiveOn: boolean;
  activeEvidenceId: string | null;
  onCite: (ev: Evidence) => void;
}) {
  const findEvidence = (label: string): Evidence | undefined => {
    const exact = result.evidence.find((e) => `Page ${e.page} · ${e.section ?? e.contentType}` === label);
    if (exact) return exact;
    const pageMatch = label.match(/Page (\d+)/);
    if (pageMatch) {
      const byPage = result.evidence.find((e) => e.page === Number(pageMatch[1]));
      if (byPage) return byPage;
    }
    return result.evidence[0];
  };

  return (
    <div className="anim-rise flex gap-3.5">
      <span className="mt-1 shrink-0">
        <LogoMark className="w-8 h-8" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <Card className="p-5">
          <AnalysisStrip result={result} adaptiveOn={adaptiveOn} />
          <div className="fade-rule my-4" />
          {result.status === "answered" ? (
            <AnswerText text={result.answer} onCite={(label) => {
              const ev = findEvidence(label);
              if (ev) onCite(ev);
            }} />
          ) : (
            <InsufficientCard result={result} />
          )}
          {result.status === "answered" && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-faint">sources</span>
              {result.evidence.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onCite(e)}
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
                    activeEvidenceId === e.id
                      ? "border-acc/50 bg-acc/10 text-acc"
                      : "border-line text-mut hover:border-acc/40 hover:text-acc"
                  )}
                >
                  #{e.rank} · p{e.page}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function RetrievalTrace({
  stages,
  analysis,
  adaptiveOn,
}: {
  stages: RetrievalStageState[];
  analysis: QueryResult | null;
  adaptiveOn: boolean;
}) {
  const analyzed = stages[0]?.state === "done";
  return (
    <div className="anim-rise flex gap-3.5">
      <span className="mt-1 shrink-0">
        <LogoMark className="w-8 h-8" />
      </span>
      <Card className="flex-1 p-5">
        <div className="flex items-center gap-2">
          <RouteIcon className="w-4 h-4 text-acc blink" />
          <p className="font-display text-sm font-semibold text-ink">Adaptive retrieval in progress</p>
        </div>
        {analyzed && analysis && (
          <div className="anim-rise mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-inset px-3.5 py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">query analysis</span>
            <QueryTypeBadge type={analysis.queryType} />
            <PipelineBadge pipeline={adaptiveOn ? analysis.selectedPipeline : "hybrid-multimodal"} size="sm" />
            <Badge tone="neutral">{analysis.retrieval}</Badge>
            <Badge tone="violet">
              <Filter className="w-3 h-3" /> RERANK ENABLED
            </Badge>
          </div>
        )}
        <div className="mt-4 space-y-2">
          {stages.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              {s.state === "done" && <CheckCircle2 className="w-4 h-4 shrink-0 text-ok" />}
              {s.state === "active" && <Loader2 className="w-4 h-4 shrink-0 animate-spin text-acc" />}
              {s.state === "pending" && <span className="w-4 h-4 shrink-0 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-line2" /></span>}
              <span
                className={cn(
                  "font-mono text-[12px]",
                  s.state === "done" && "text-mut",
                  s.state === "active" && "text-acc",
                  s.state === "pending" && "text-faint"
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* --------------------------------- page ---------------------------------- */

export default function AssistantPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Document | null | "missing">(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stages, setStages] = useState<RetrievalStageState[] | null>(null);
  const [input, setInput] = useState("");
  const [adaptiveOn, setAdaptiveOn] = useState(true);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Evidence | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<QueryResult | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const readyDocs = api.getDocumentsSync().filter((d) => d.status === "ready");

  const switchSource = (id: string, label?: string) => {
    navigate(nav.assistantFor(id));
    setSourcesOpen(false);
    if (label) toast(`Now asking ${label}.`, "info");
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = stages !== null;

  useEffect(() => {
    let live = true;
    setDoc(null);
    setMessages([]);
    setStages(null);
    setPendingAnalysis(null);
    setActiveEvidenceId(null);
    setPreview(null);
    setDrawerOpen(false);
    setInput("");
    if (!documentId) return;
    api.getDocument(documentId).then((d) => live && setDoc(d ?? "missing"));
    return () => {
      live = false;
    };
  }, [documentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, stages]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy || !documentId) return;
    setInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", question: q }]);
    setPendingAnalysis(matchQuery(q));
    setStages(STAGE_LABELS.map((label) => ({ label, state: "pending" as const })));

    for (let i = 0; i < STAGE_LABELS.length; i++) {
      setStages((s) =>
        s === null ? s : s.map((st, idx) => ({ ...st, state: idx < i ? "done" : idx === i ? "active" : "pending" }))
      );
      await sleep(i < 2 ? 520 : 400);
    }

    try {
      const result = await api.askQuestion(documentId, q);
      if (!adaptiveOn) result.selectedPipeline = "hybrid-multimodal";
      setStages((s) => (s ? s.map((st) => ({ ...st, state: "done" as const })) : s));
      await sleep(260);
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", result }]);
      setActiveEvidenceId(result.evidence[0]?.id ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not answer this question.";
      toast(message, "bad");
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          result: {
            id: `err-${Date.now().toString(36)}`,
            question: q,
            answer: message,
            queryType: "text",
            selectedPipeline: "hybrid-multimodal",
            retrieval: "backend error",
            rerankingEnabled: false,
            confidence: 0,
            evidenceStrength: "low",
            evidence: [],
            citations: [],
            latencyMs: 0,
            status: "error",
            answeredAt: new Date().toISOString(),
          },
        },
      ]);
    } finally {
      setStages(null);
      setPendingAnalysis(null);
    }
  };

  const currentEvidence = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const r = messages[i].result;
      if (r && r.evidence.length > 0) return r.evidence;
    }
    return [];
  })();

  const handleCite = (ev: Evidence) => {
    setActiveEvidenceId(ev.id);
    setPreview(ev);
  };

  if (doc === "missing") {
    return (
      <EmptyState
        icon={FileText}
        title="Document not found"
        desc="Pick a document from the workspace to start asking questions."
        action={
          <Button onClick={() => navigate(nav.documents)}>
            <ArrowLeft className="w-4 h-4" /> Back to Documents
          </Button>
        }
      />
    );
  }

  const evidencePanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Evidence</h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-faint">ranked sources · traceable</p>
        </div>
        <Badge tone="cyan">{currentEvidence.length} SOURCES</Badge>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {busy ? (
          <EvidenceListSkeleton />
        ) : currentEvidence.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <Search className="w-6 h-6 text-faint" />
            <p className="mt-3 text-sm font-medium text-ink">No evidence yet</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-mut">
              Ask a question and the ranked source evidence will appear here — every answer is traceable.
            </p>
          </div>
        ) : (
          currentEvidence.map((ev) => (
            <EvidenceCard key={ev.id} ev={ev} active={ev.id === activeEvidenceId} onSelect={handleCite} />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[540px] flex-col lg:h-[calc(100vh-6.5rem)]">
      {/* header */}
      <div className="anim-rise mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="min-w-0">
          <button
            onClick={() => documentId && navigate(nav.workspaceFor(documentId))}
            className="inline-flex items-center gap-1.5 text-[12px] text-mut transition-colors hover:text-ink"
          >
            <ArrowLeft className="w-3 h-3" /> Workspace
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-xl font-bold tracking-tight text-ink">Ask Document</h1>
            {doc && (
              <span className="inline-flex max-w-[260px] items-center gap-1.5 truncate rounded-md border border-line bg-panel px-2 py-1 font-mono text-[11px] text-mut">
                <FileText className="w-3 h-3 shrink-0 text-acc2" />
                <span className="truncate">{doc.name}</span>
              </span>
            )}
            <Tip label="Switch source or upload a new PDF">
              <button
                onClick={() => setSourcesOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-1 font-mono text-[11px] text-mut transition-colors hover:border-acc/40 hover:text-acc"
              >
                <ArrowLeftRight className="w-3 h-3" /> Sources
              </button>
            </Tip>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Tip label={adaptiveOn ? "Router selects the pipeline per query" : "Fixed hybrid pipeline for every query"}>
            <button
              onClick={() => setAdaptiveOn((v) => !v)}
              role="switch"
              aria-checked={adaptiveOn}
              className="flex items-center gap-2.5 rounded-lg border border-line bg-panel px-3 py-2 transition-colors hover:border-line2"
            >
              <span className="text-[12px] font-medium text-mut">Adaptive Retrieval</span>
              <span className={cn("relative h-5 w-9 rounded-full transition-colors", adaptiveOn ? "bg-acc" : "bg-line2")}>
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                    adaptiveOn ? "left-[18px]" : "left-0.5"
                  )}
                />
              </span>
              <span className={cn("font-mono text-[11px] font-semibold", adaptiveOn ? "text-acc" : "text-faint")}>
                {adaptiveOn ? "ON" : "OFF"}
              </span>
            </button>
          </Tip>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-[11px]",
              busy ? "border-warn/30 bg-warn/10 text-warn" : "border-ok/30 bg-ok/10 text-ok"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", busy ? "bg-warn blink" : "bg-ok")} />
            {busy ? "RETRIEVING" : "READY"}
          </span>
          <Tip label="Start a new conversation">
            <Button variant="ghost" size="sm" onClick={() => { setMessages([]); setStages(null); setActiveEvidenceId(null); setPendingAnalysis(null); }}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </Tip>
        </div>
      </div>

      {/* body */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* chat column */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
            {doc === null ? (
              <div className="space-y-5">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : messages.length === 0 && !busy ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="relative">
                  <LogoMark className="w-14 h-14" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-panel2">
                    <Sparkles className="w-3 h-3 text-acc" />
                  </span>
                </span>
                <h3 className="mt-5 font-display text-xl font-bold text-ink">Ask anything about this document</h3>
                <p className="mt-2 max-w-sm text-[13px] text-mut">
                  The router classifies each question and picks the right retrieval pipeline — watch the trace above
                  every answer.
                </p>
                <div className="mt-7 flex w-full max-w-full gap-2 overflow-x-auto pb-2 sm:grid sm:max-w-xl sm:grid-cols-2 sm:overflow-visible sm:pb-0">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      className="min-w-[240px] rounded-lg border border-line bg-panel2/70 px-4 py-3 text-left text-[13px] text-mut transition-all hover:-translate-y-0.5 hover:border-acc/40 hover:text-ink sm:min-w-0"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-warn/30 bg-warn/5 px-4 py-2.5 text-[12px] text-warn">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Answers are limited to the uploaded PDF. Missing topics are refused instead of guessed.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="anim-rise flex justify-end">
                      <div className="max-w-[92%] rounded-xl rounded-br-sm border border-acc2/30 bg-acc2/10 px-4 py-3 sm:max-w-[85%]">
                        <p className="text-[14px] leading-relaxed text-ink">{m.question}</p>
                      </div>
                    </div>
                  ) : (
                    m.result && (
                      <AssistantMessage
                        key={m.id}
                        result={m.result}
                        adaptiveOn={adaptiveOn}
                        activeEvidenceId={activeEvidenceId}
                        onCite={handleCite}
                      />
                    )
                  )
                )}
                {stages && <RetrievalTrace stages={stages} analysis={pendingAnalysis} adaptiveOn={adaptiveOn} />}
              </div>
            )}
          </div>

          {/* composer */}
          <div className="border-t border-line p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex items-center gap-2.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={doc ? `Ask about ${doc.name}...` : "Loading document..."}
                disabled={busy || doc === null}
                className="h-12 flex-1 rounded-xl border border-line bg-inset px-4 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-acc/50 focus:bg-panel disabled:opacity-50"
              />
              <Tip label="Ask by voice — coming soon">
                <button
                  type="button"
                  aria-label="Voice input (coming soon)"
                  onClick={() => toast("Voice input is coming soon — type your question for now.", "info")}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-mut transition-all hover:border-vio/40 hover:text-vio active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </Tip>
              <Tip label="Attach a new source PDF">
                <button
                  type="button"
                  aria-label="Attach source document"
                  onClick={() => setSourcesOpen(true)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-mut transition-all hover:border-acc/40 hover:text-acc active:scale-95"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </Tip>
              <Tip label="Send question (Enter)">
                <Button type="submit" disabled={busy || !input.trim() || doc === null} className="h-12 w-12 px-0">
                  <Send className="w-4 h-4" />
                </Button>
              </Tip>
            </form>
            <p className="mt-2.5 text-center font-mono text-[10px] text-faint">
              answers are generated by the FastAPI RAG backend · unsupported questions stay grounded to the source
            </p>
          </div>
        </Card>

        {/* evidence column — desktop */}
        <Card className="hidden min-h-0 overflow-hidden lg:block">{evidencePanel}</Card>
      </div>

      {/* evidence drawer — mobile */}
      {currentEvidence.length > 0 && !drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full border border-acc/40 bg-panel2 px-5 py-2.5 font-mono text-[12px] text-acc shadow-2xl lg:hidden"
        >
          <span className="inline-flex items-center gap-2">
            <PanelBottom className="w-3.5 h-3.5" /> Evidence · {currentEvidence.length} sources
          </span>
        </button>
      )}
      {drawerOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-[#02060f]/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="anim-rise absolute inset-x-0 bottom-0 max-h-[75vh] overflow-hidden rounded-t-2xl border-t border-line bg-panel shadow-2xl">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close evidence panel"
              className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-mut hover:bg-ink/5 hover:text-ink"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="max-h-[75vh] overflow-y-auto">{evidencePanel}</div>
          </div>
        </div>
      )}

      <EvidencePreviewModal ev={preview} onClose={() => setPreview(null)} />

      {/* sources modal */}
      <Modal open={sourcesOpen} onClose={() => setSourcesOpen(false)} title="Question source" wide>
        <p className="text-sm text-mut">
          Choose which document the assistant retrieves evidence from — or drop a new PDF right here and it joins the
          conversation instantly.
        </p>
        <div className="mt-4 space-y-2">
          {readyDocs.map((d) => {
            const current = d.id === documentId;
            return (
              <button
                key={d.id}
                onClick={() => switchSource(d.id, d.name)}
                className={cn(
                  "flex w-full items-center gap-3.5 rounded-lg border px-4 py-3 text-left transition-all",
                  current
                    ? "border-acc/50 bg-acc/5"
                    : "border-line bg-inset hover:border-line2 hover:bg-panel2"
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-panel2">
                  <FileText className="w-4 h-4 text-acc2" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{d.name}</span>
                  <span className="block font-mono text-[11px] text-faint">
                    {d.pages} pages · ready · backend indexed
                  </span>
                </span>
                {current ? (
                  <Badge tone="cyan">ACTIVE</Badge>
                ) : (
                  <span className="font-mono text-[11px] text-faint">switch</span>
                )}
              </button>
            );
          })}
          {readyDocs.length === 0 && (
            <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-faint">
              No ready documents yet — upload one below.
            </p>
          )}
        </div>
        <div className="fade-rule my-5" />
        <UploadZone compact onUploaded={(d) => switchSource(d.id, d.name)} />
      </Modal>
    </div>
  );
}
