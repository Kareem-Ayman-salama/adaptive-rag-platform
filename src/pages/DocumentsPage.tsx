import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  ArrowRight,
  AlertTriangle,
  Inbox,
  Layers,
  MessageSquare,
  Timer,
  Files,
  CheckCircle2,
} from "lucide-react";
import { api } from "../services/api";
import { nav } from "../config/branding";
import type { DashboardStats, Document, UploadStage } from "../types";
import {
  Badge,
  Button,
  Card,
  IndexingPill,
  PipelineBadge,
  ProgressBar,
  Skeleton,
  StatusPill,
  TypeChip,
  cn,
  timeAgo,
  toast,
} from "../components/ui";

/* ------------------------------ stats row ------------------------------ */

function StatsRow() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  useEffect(() => {
    let live = true;
    api.getStats().then((s) => live && setStats(s));
    return () => {
      live = false;
    };
  }, []);

  const items = stats
    ? [
        { icon: Files, label: "Documents", value: String(stats.documents), hint: "in workspace" },
        { icon: Layers, label: "Pages Indexed", value: String(stats.pagesIndexed), hint: "multimodal chunks" },
        { icon: MessageSquare, label: "Questions Asked", value: String(stats.questionsAsked), hint: "sample · demo data" },
        { icon: Timer, label: "Avg. Response", value: `${(stats.avgResponseMs / 1000).toFixed(1)} s`, hint: "sample · demo data" },
      ]
    : [];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats === null
        ? Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-7 w-14" />
              <Skeleton className="mt-2 h-3 w-24" />
            </Card>
          ))
        : items.map((it) => (
            <Card key={it.label} className="group p-5 transition-colors hover:border-line2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-mut">{it.label}</p>
                <it.icon className="w-4 h-4 text-faint transition-colors group-hover:text-acc" />
              </div>
              <p className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">{it.value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">{it.hint}</p>
            </Card>
          ))}
    </div>
  );
}

/* ------------------------------ upload zone ----------------------------- */

function UploadZone({ onUploaded }: { onUploaded: (d: Document) => void }) {
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [result, setResult] = useState<Document | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const busy = stage !== null && result === null;

  const startUpload = (file: File) => {
    if (busy) return;
    if (file.size > 50 * 1024 * 1024) {
      toast("File exceeds the 50 MB demo limit.", "bad");
      return;
    }
    setResult(null);
    setHistory([]);
    setStage({ label: "Queued...", progress: 4 });
    api
      .uploadDocument(file.name, file.size / (1024 * 1024), (s) => {
        setStage(s);
        setHistory((h) => (h[h.length - 1] === s.label ? h : [...h, s.label]));
      })
      .then((doc) => {
        setResult(doc);
        setStage(null);
        toast(`${doc.name} analyzed — recommended pipeline: Hybrid Multimodal`);
        onUploaded(doc);
      });
  };

  return (
    <Card className={cn("relative overflow-hidden transition-colors", dragging && "border-acc/50")}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) startUpload(f);
          e.target.value = "";
        }}
      />

      {!stage && !result && (
        <button
          className="group flex w-full flex-col items-center rounded-xl border-2 border-dashed border-line px-6 py-12 text-center transition-all duration-300 hover:border-acc/50 hover:bg-acc/5"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) startUpload(f);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <span
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl border border-line bg-panel2 transition-transform duration-300 group-hover:-translate-y-1",
              dragging && "-translate-y-1 border-acc/50"
            )}
          >
            <UploadCloud className={cn("w-6 h-6 text-acc", dragging && "blink")} />
          </span>
          <p className="mt-5 font-display text-lg font-semibold text-ink">
            {dragging ? "Release to analyze" : "Drag & drop a PDF"}
          </p>
          <p className="mt-1.5 text-sm text-mut">
            or <span className="font-medium text-acc">browse files</span> · up to 50 MB
          </p>
          <p className="mt-5 max-w-md font-mono text-[11px] leading-relaxed text-faint">
            Pages are analyzed, content types detected, and retrieval indexes built automatically.
            Frontend demo — no file leaves your browser.
          </p>
        </button>
      )}

      {busy && stage && (
        <div className="px-6 py-10 sm:px-10">
          <div className="mx-auto max-w-md">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-acc/30 bg-acc/10">
                <FileText className="w-4 h-4 text-acc blink" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">Processing document</p>
                <p className="font-mono text-[11px] text-acc">{stage.label}</p>
              </div>
              <span className="font-mono text-sm text-mut">{stage.progress}%</span>
            </div>
            <div className="mt-4">
              <ProgressBar value={stage.progress} />
            </div>
            <div className="mt-5 space-y-1.5">
              {history.map((h) => (
                <p key={h} className="anim-rise flex items-center gap-2 font-mono text-[11px] text-mut">
                  <span className="w-1.5 h-1.5 rounded-full bg-acc shrink-0" /> {h}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="anim-rise px-6 py-8 sm:px-10">
          <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-ok/30 bg-ok/10">
              <CheckCircle2 className="w-5 h-5 text-ok" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-semibold text-ink">Document analyzed — {result.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[12px] text-mut">
                <span>{result.pages} pages</span>
                <span>{result.counts.chart ?? 0} charts</span>
                <span>{result.counts.table ?? 0} tables</span>
                <span>{result.counts.image ?? 0} figures</span>
                <span className="text-acc">recommended: Hybrid Multimodal</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="secondary" onClick={() => navigate(nav.workspaceFor(result.id))}>
                Open Workspace
              </Button>
              <Button size="sm" onClick={() => navigate(nav.assistantFor(result.id))}>
                Ask Document <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ----------------------------- document card ---------------------------- */

function DocumentCard({ doc, index }: { doc: Document; index: number }) {
  const navigate = useNavigate();
  const failed = doc.status === "failed";
  const processing = doc.status === "processing";

  return (
    <button
      onClick={() => !processing && navigate(nav.workspaceFor(doc.id))}
      disabled={processing}
      style={{ animationDelay: `${index * 60}ms` }}
      className={cn(
        "anim-rise group w-full rounded-xl border border-line bg-panel p-5 text-left transition-all duration-300",
        !processing && "hover:-translate-y-0.5 hover:border-line2 hover:shadow-[0_18px_40px_-20px_rgba(2,8,20,0.9)]",
        failed && "border-bad/25",
        processing && "opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg border",
            failed ? "border-bad/30 bg-bad/10" : "border-line bg-panel2"
          )}
        >
          <FileText className={cn("w-4 h-4", failed ? "text-bad" : "text-acc2")} />
        </span>
        <StatusPill status={doc.status} />
      </div>

      <p className="mt-4 truncate font-display text-[15px] font-semibold text-ink" title={doc.name}>
        {doc.name}
      </p>
      <p className="mt-1 font-mono text-[11px] text-faint">
        {doc.pages} pages · {doc.sizeMb} MB · {timeAgo(doc.uploadedAt)}
      </p>

      {failed ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2.5 text-[12px] leading-snug text-bad">
          <AlertTriangle className="mt-0.5 w-3.5 h-3.5 shrink-0" /> {doc.error}
        </p>
      ) : processing ? (
        <div className="mt-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {doc.contentTypes.slice(0, 4).map((t) => (
              <TypeChip key={t} type={t} small />
            ))}
            {doc.contentTypes.length > 4 && (
              <span className="rounded-md border border-line bg-inset px-1.5 py-0.5 font-mono text-[10px] text-faint">
                +{doc.contentTypes.length - 4}
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5">
            <PipelineBadge pipeline={doc.recommendedPipeline} size="sm" />
            <IndexingPill status={doc.indexing} />
          </div>
        </>
      )}

      {!processing && (
        <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-faint transition-all group-hover:gap-2 group-hover:text-acc">
          {failed ? "Open details" : "Open workspace"} <ArrowRight className="w-3.5 h-3.5" />
        </span>
      )}
    </button>
  );
}

/* --------------------------------- page --------------------------------- */

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[] | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let live = true;
    api.getDocuments().then((d) => live && setDocs(d));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">Welcome back</h1>
            <Badge tone="amber" className="hidden sm:inline-flex">demo data</Badge>
          </div>
          <p className="mt-1.5 text-sm text-mut">Your intelligent document workspace — upload, analyze, route, ask.</p>
        </div>
        <Button onClick={() => zoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
          <UploadCloud className="w-4 h-4" /> Upload Document
        </Button>
      </div>

      <StatsRow />

      <div ref={zoneRef}>
        <UploadZone onUploaded={(d) => setDocs((prev) => [d, ...(prev ?? [])])} />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Documents</h2>
          <p className="font-mono text-[11px] text-faint">{docs ? `${docs.length} total` : "loading..."}</p>
        </div>

        {docs === null ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-4 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-5 w-14" />
                </div>
              </Card>
            ))}
          </div>
        ) : docs.length === 0 ? (
          <Card className="p-6">
            <div className="flex flex-col items-center py-10 text-center">
              <Inbox className="w-8 h-8 text-faint" />
              <p className="mt-3 font-display text-lg font-semibold text-ink">No documents yet</p>
              <p className="mt-1 text-sm text-mut">Upload your first PDF to start the analysis pipeline.</p>
              <Button className="mt-5" onClick={() => zoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                <UploadCloud className="w-4 h-4" /> Upload a PDF
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {docs.map((d, i) => (
              <DocumentCard key={d.id} doc={d} index={i} />
            ))}
          </div>
        )}
      </div>

      <p className="text-center font-mono text-[11px] text-faint">
        Tip: open <button className="text-acc hover:underline" onClick={() => navigate(nav.assistantFor("ai-research-report"))}>AI_Research_Report</button> to run the full guided demo.
      </p>
    </div>
  );
}
