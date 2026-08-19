import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  RefreshCw,
  Trash2,
  MoreHorizontal,
  Download,
  Copy,
  BarChart3,
  FileText,
  Eye,
  ScanLine,
  Table2,
  Layers,
  Route as RouteIcon,
  FileSearch,
} from "lucide-react";
import { api } from "../services/api";
import { nav } from "../config/branding";
import type { ContentType, Document, DocumentProfile, PipelineId, UploadStage } from "../types";
import {
  Badge,
  Button,
  Card,
  CONTENT_META,
  EmptyState,
  PIPELINE_META,
  PipelineBadge,
  ProgressBar,
  Skeleton,
  StatusPill,
  Tip,
  TypeChip,
  cn,
  timeAgo,
  toast,
  useClickOutside,
} from "../components/ui";

const PROFILE_META: Record<DocumentProfile, { label: string; icon: ComponentType<{ className?: string }>; desc: string }> = {
  mixed: { label: "Mixed", icon: Layers, desc: "Balanced text and visual content" },
  "text-heavy": { label: "Text-heavy", icon: FileText, desc: "Mostly structured prose" },
  visual: { label: "Visual", icon: Eye, desc: "Dominated by figures and imagery" },
  scanned: { label: "Scanned", icon: ScanLine, desc: "Digitized paper — OCR applied" },
  "table-heavy": { label: "Table-heavy", icon: Table2, desc: "Dominated by structured tables" },
};

function IntelligenceCards({ doc }: { doc: Document }) {
  const profile = PROFILE_META[doc.profile];
  const pipe = PIPELINE_META[doc.recommendedPipeline];
  const counts = Object.entries(doc.counts) as Array<[ContentType, number]>;
  const maxCount = Math.max(1, ...counts.map(([, v]) => v));

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Document Type</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-acc2/30 bg-acc2/10">
            <profile.icon className="w-4 h-4 text-acc2" />
          </span>
          <div>
            <p className="font-display text-base font-semibold text-ink">{profile.label}</p>
            <p className="text-[11px] text-faint">{profile.desc}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Pages</p>
        <p className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">{doc.pages}</p>
        <p className="mt-1 font-mono text-[11px] text-faint">{doc.sizeMb} MB · uploaded {timeAgo(doc.uploadedAt)}</p>
      </Card>

      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Content Detected</p>
        <div className="mt-3 space-y-2">
          {counts.slice(0, 4).map(([type, n]) => {
            const meta = CONTENT_META[type];
            return (
              <div key={type} className="flex items-center gap-2">
                <meta.icon className={cn("w-3.5 h-3.5 shrink-0", meta.text)} />
                <span className="w-14 text-[11px] text-mut">{meta.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                  <div className={cn("h-full rounded-full growx", meta.dot)} style={{ width: `${(n / maxCount) * 100}%` }} />
                </div>
                <span className="w-7 text-right font-mono text-[11px] text-ink">{n}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Recommended Retrieval</p>
        <div className="mt-3">
          <PipelineBadge pipeline={doc.recommendedPipeline} />
          <p className="mt-2.5 text-[12px] leading-relaxed text-mut">{pipe.desc}</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider" style={{ color: pipe.color }}>
            router confidence 0.92 · demo
          </p>
        </div>
      </Card>
    </div>
  );
}

function StructureTimeline({ doc }: { doc: Document }) {
  const [filter, setFilter] = useState<ContentType | "all">("all");
  const types = useMemo(() => {
    const present = new Set<ContentType>();
    doc.structure.forEach((b) => b.types.forEach((t) => present.add(t)));
    return Array.from(present);
  }, [doc.structure]);

  const blocks = filter === "all" ? doc.structure : doc.structure.filter((b) => b.types.includes(filter));

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel2">
            <FileSearch className="w-4 h-4 text-acc" />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-ink">Document Structure</h3>
            <p className="text-[12px] text-faint">Detected content map · {doc.structure.length} key regions</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors",
              filter === "all" ? "border-acc/40 bg-acc/10 text-acc" : "border-line text-mut hover:text-ink"
            )}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "rounded-md border px-2.5 py-1 font-mono text-[11px] capitalize transition-colors",
                filter === t ? "border-acc/40 bg-acc/10 text-acc" : "border-line text-mut hover:text-ink"
              )}
            >
              {CONTENT_META[t].label}
            </button>
          ))}
        </div>
      </div>

      {doc.structure.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-faint">
          Structure map appears once analysis completes.
        </p>
      ) : blocks.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-faint">
          No {filter} regions detected in this document.
        </p>
      ) : (
        <ol className="mt-6 space-y-0 border-l border-line pl-5">
          {blocks.map((b, i) => (
            <li key={`${b.page}-${i}`} className="anim-rise relative pb-4 last:pb-0" style={{ animationDelay: `${i * 35}ms` }}>
              <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-page bg-line2" />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="w-14 font-mono text-[12px] font-semibold text-acc">p.{b.page}</span>
                <span className="text-[13px] text-ink">{b.label}</span>
                <span className="flex gap-1.5">
                  {b.types.map((t) => (
                    <TypeChip key={t} type={t} small />
                  ))}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function RoutingCard({ doc }: { doc: Document }) {
  const c = doc.counts;
  const visual = (c.image ?? 0) + (c.chart ?? 0) + (c.diagram ?? 0) + (c.scanned ?? 0);
  const rows: Array<{ label: string; pipeline: PipelineId; volume: number }> = [
    { label: "Text-heavy pages", pipeline: "text-rag", volume: c.text ?? 0 },
    { label: "Visual pages", pipeline: "vision-rag", volume: visual },
    { label: "Table pages", pipeline: "table-retrieval", volume: c.table ?? 0 },
    { label: "Mixed pages", pipeline: "hybrid-multimodal", volume: Math.round(doc.pages * 0.18) },
  ];
  const max = Math.max(1, ...rows.map((r) => r.volume));

  return (
    <Card className="relative overflow-hidden p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,color-mix(in_oklab,var(--acc)_7%,transparent),transparent_70%)]" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-warn/30 bg-warn/10">
              <RouteIcon className="w-4 h-4 text-warn" />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Automatic Document Router</h3>
              <p className="text-[12px] text-faint">How this document's pages map to retrieval pipelines</p>
            </div>
          </div>
          <Badge tone="cyan">auto</Badge>
        </div>

        <div className="mt-6 space-y-3">
          {rows.map((r, i) => {
            const meta = PIPELINE_META[r.pipeline];
            return (
              <div key={r.label} className="anim-rise rounded-lg border border-line bg-panel2/60 p-4" style={{ animationDelay: `${i * 90}ms` }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[13px] font-medium text-ink">{r.label}</span>
                  <span className="flex items-center gap-2.5">
                    <ArrowRight className="w-4 h-4 text-faint" />
                    <PipelineBadge pipeline={r.pipeline} size="sm" />
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className="h-full rounded-full growx"
                      style={{ width: `${(r.volume / max) * 100}%`, background: meta.color, animationDelay: `${i * 90}ms` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-faint">{r.volume} regions</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ok/25 bg-ok/5 px-4 py-3">
          <p className="text-[13px] text-ink">
            Router decision for this document: <span className="font-semibold text-ok">{PIPELINE_META[doc.recommendedPipeline].label}</span>
          </p>
          <span className="font-mono text-[11px] text-faint">confidence 0.92 · sample</span>
        </div>
      </div>
    </Card>
  );
}

export default function DocumentWorkspacePage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Document | null | "missing">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [reStage, setReStage] = useState<UploadStage | null>(null);
  const moreRef = useClickOutside(() => setMoreOpen(false));

  useEffect(() => {
    let live = true;
    setDoc(null);
    if (!documentId) return;
    api.getDocument(documentId).then((d) => live && setDoc(d ?? "missing"));
    return () => {
      live = false;
    };
  }, [documentId]);

  const handleReprocess = () => {
    if (!doc || doc === "missing" || reprocessing) return;
    setReprocessing(true);
    setReStage({ label: "Starting...", progress: 5 });
    api
      .reprocessDocument(doc.id, (s) => setReStage(s))
      .then((d) => {
        if (d) setDoc(d);
        setReprocessing(false);
        setReStage(null);
        toast("Reprocessing complete — indexes rebuilt.");
      });
  };

  const handleDelete = () => {
    if (!doc || doc === "missing") return;
    setDeleting(true);
    api.deleteDocument(doc.id).then(() => {
      setDeleting(false);
      setConfirmDelete(false);
      toast(`${doc.name} deleted from workspace.`, "info");
      navigate(nav.documents);
    });
  };

  if (doc === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-4 h-8 w-20" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <Skeleton className="h-4 w-40" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (doc === "missing") {
    return (
      <EmptyState
        icon={FileText}
        title="Document not found"
        desc="This document doesn't exist in the demo workspace. It may have been deleted."
        action={
          <Button onClick={() => navigate(nav.documents)}>
            <ArrowLeft className="w-4 h-4" /> Back to Documents
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="anim-rise">
        <button
          onClick={() => navigate(nav.documents)}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-mut transition-colors hover:text-ink"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Documents
        </button>
        <Card className="p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-panel2">
                <FileText className="w-5 h-5 text-acc2" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink break-all">{doc.name}</h1>
                  <StatusPill status={doc.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[12px] text-faint">
                  <span>{doc.pages} pages</span>
                  <span>{doc.sizeMb} MB</span>
                  <span className="capitalize">{PROFILE_META[doc.profile].label} document</span>
                  <span>uploaded {timeAgo(doc.uploadedAt)}</span>
                </div>
                {doc.error && (
                  <p className="mt-3 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-[12px] text-bad">{doc.error}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => navigate(nav.assistantFor(doc.id))} disabled={doc.status !== "ready"}>
                <MessageSquare className="w-4 h-4" /> Ask Document
              </Button>
              <Tip label="Re-run the analysis pipeline (simulated)">
                <Button variant="secondary" onClick={handleReprocess} loading={reprocessing} disabled={doc.status === "processing"}>
                  <RefreshCw className={cn("w-4 h-4", reprocessing && "animate-spin")} /> Reprocess
                </Button>
              </Tip>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
              <div className="relative" ref={moreRef}>
                <Button variant="ghost" size="md" onClick={() => setMoreOpen((v) => !v)} title="More actions">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
                {moreOpen && (
                  <div className="anim-rise absolute right-0 top-12 z-30 w-52 rounded-xl border border-line bg-panel p-1.5 shadow-2xl">
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-mut hover:bg-ink/5 hover:text-ink"
                      onClick={() => {
                        setMoreOpen(false);
                        toast("Summary export queued — demo action only.", "info");
                      }}
                    >
                      <Download className="w-3.5 h-3.5" /> Export summary
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-mut hover:bg-ink/5 hover:text-ink"
                      onClick={() => {
                        setMoreOpen(false);
                        navigator.clipboard?.writeText(doc.id).catch(() => undefined);
                        toast("Document ID copied to clipboard.");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy document ID
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-mut hover:bg-ink/5 hover:text-ink"
                      onClick={() => {
                        setMoreOpen(false);
                        navigate(nav.analytics);
                      }}
                    >
                      <BarChart3 className="w-3.5 h-3.5" /> System analytics
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {reStage && reprocessing && (
            <div className="anim-rise mt-5 rounded-lg border border-acc/25 bg-acc/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[12px] text-acc">{reStage.label}</p>
                <p className="font-mono text-[12px] text-faint">{reStage.progress}%</p>
              </div>
              <div className="mt-2">
                <ProgressBar value={reStage.progress} />
              </div>
            </div>
          )}
        </Card>
      </div>

      <IntelligenceCards doc={doc} />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <StructureTimeline doc={doc} />
        <RoutingCard doc={doc} />
      </div>

      {/* delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#02060f]/70 backdrop-blur-sm" onClick={() => !deleting && setConfirmDelete(false)} />
          <div className="anim-rise relative w-full max-w-sm rounded-2xl border border-line bg-panel p-6 shadow-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-bad/30 bg-bad/10">
              <Trash2 className="w-5 h-5 text-bad" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-ink">Delete document?</h3>
            <p className="mt-1.5 text-sm text-mut">
              <span className="font-medium text-ink">{doc.name}</span> and its retrieval indexes will be removed from
              the demo workspace.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
                Delete document
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
