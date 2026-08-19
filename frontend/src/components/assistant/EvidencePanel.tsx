import { BarChart3, GitBranch, Image as ImageIcon, ScanLine, FileText, Table2, BadgeCheck } from "lucide-react";
import type { ContentType, Evidence } from "../../types";
import { Badge, CONTENT_META, Modal, ScoreBar, Skeleton, cn } from "../ui";

/* ------------------------------ evidence card ----------------------------- */

export function EvidenceCard({
  ev,
  active,
  onSelect,
}: {
  ev: Evidence;
  active: boolean;
  onSelect: (ev: Evidence) => void;
}) {
  const meta = CONTENT_META[ev.contentType];
  return (
    <button
      onClick={() => onSelect(ev)}
      className={cn(
        "group w-full rounded-xl border p-4 text-left transition-all duration-200",
        active
          ? "border-acc/50 bg-acc/5 shadow-[0_0_30px_-12px_color-mix(in_oklab,var(--acc)_50%,transparent)]"
          : "border-line bg-panel hover:border-line2 hover:bg-panel2/60"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-[12px] font-bold",
            active ? "border-acc/40 bg-acc/10 text-acc" : "border-line bg-panel2 text-mut"
          )}
        >
          #{ev.rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[12px] font-semibold text-ink">
              Page {ev.page}
              {ev.section && <span className="text-mut"> · {ev.section}</span>}
            </p>
            <meta.icon className={cn("w-4 h-4 shrink-0", meta.text)} />
          </div>
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-mut">{ev.preview}</p>
          <div className="mt-3 space-y-1.5">
            <ScoreBar label="retrieval" value={ev.retrievalScore} />
            <ScoreBar label="reranker" value={ev.rerankerScore} />
          </div>
          <p className="mt-2.5 truncate font-mono text-[10px] text-faint">{ev.sourceId}</p>
        </div>
      </div>
    </button>
  );
}

export function EvidenceListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-panel p-4">
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-1.5 h-3 w-5/6" />
              <Skeleton className="mt-3 h-2 w-full" />
              <Skeleton className="mt-1.5 h-2 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------- fake page preview ---------------------------- */

function TextPreview({ highlighted }: { highlighted: string }) {
  const widths = [92, 100, 86, 97, 90];
  return (
    <div className="space-y-2.5">
      {widths.map((w, i) => (
        <div key={i} className="paper-line h-2.5" style={{ width: `${w}%` }} />
      ))}
      <div className="hl-pulse my-1 rounded-md border border-[#0aa6c0]/60 bg-[#0aa6c0]/12 p-3">
        {[100, 96, 78].map((w, i) => (
          <div key={i} className="mb-2 h-2.5 rounded bg-[#0aa6c0]/45 last:mb-0" style={{ width: `${w}%` }} />
        ))}
        <p className="mt-2 text-[11px] font-medium leading-snug text-[#0b5e75]">{highlighted}</p>
      </div>
      {[88, 95, 60].map((w, i) => (
        <div key={i} className="paper-line h-2.5" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

function ChartPreview({ label }: { label: string }) {
  const bars = [42, 66, 54, 88, 60, 74];
  return (
    <div>
      <div className="paper-line mb-4 h-2.5 w-2/3" />
      <div className="hl-pulse rounded-lg border-2 border-[#0aa6c0]/70 bg-white p-4">
        <div className="flex h-32 items-end gap-3">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 3 ? "#0aa6c0" : "#9db8dd" }} />
          ))}
        </div>
        <div className="mt-2 flex gap-3">
          {bars.map((_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded bg-[#dbe4f3]" />
          ))}
        </div>
        <p className="mt-3 text-center font-mono text-[10px] font-semibold text-[#0b5e75]">{label} — source region</p>
      </div>
      <div className="paper-line mt-4 h-2.5 w-1/2" />
    </div>
  );
}

function TablePreview({ label }: { label: string }) {
  const rows = 5;
  const cols = 4;
  return (
    <div>
      <div className="paper-line mb-4 h-2.5 w-1/2" />
      <div className="hl-pulse overflow-hidden rounded-lg border-2 border-[#0aa6c0]/70">
        <div className="grid grid-cols-4 gap-px bg-[#dbe4f3]">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="bg-[#e7edf8] px-2 py-1.5 font-mono text-[9px] font-bold text-[#4a5f83]">
              {["System", "Hit", "Prec", "Lat"][c]}
            </div>
          ))}
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => (
              <div
                key={`${r}-${c}`}
                className={cn("px-2 py-2", r === 1 ? "bg-[#0aa6c0]/15" : "bg-white")}
              >
                <div className={cn("h-1.5 rounded", r === 1 ? "bg-[#0aa6c0]/50" : "bg-[#dbe4f3]")} style={{ width: `${60 + ((r * 13 + c * 21) % 35)}%` }} />
              </div>
            ))
          )}
        </div>
        <p className="bg-white px-2 py-1.5 text-center font-mono text-[10px] font-semibold text-[#0b5e75]">
          {label} — highlighted rows cited
        </p>
      </div>
    </div>
  );
}

function DiagramPreview({ label }: { label: string }) {
  return (
    <div>
      <div className="paper-line mb-4 h-2.5 w-3/5" />
      <div className="hl-pulse rounded-lg border-2 border-[#0aa6c0]/70 bg-white p-4">
        <svg viewBox="0 0 240 110" className="w-full">
          <rect x="8" y="40" width="60" height="30" rx="6" fill="#e7edf8" stroke="#9db8dd" />
          <rect x="92" y="8" width="60" height="30" rx="6" fill="#e7edf8" stroke="#9db8dd" />
          <rect x="92" y="72" width="60" height="30" rx="6" fill="#d5f4f9" stroke="#0aa6c0" strokeWidth="1.6" />
          <rect x="176" y="40" width="56" height="30" rx="6" fill="#e7edf8" stroke="#9db8dd" />
          <path d="M68 50 L92 28 M68 60 L92 82 M152 28 L176 50 M152 82 L176 62" stroke="#7f97bd" strokeWidth="1.4" fill="none" />
          <text x="38" y="59" textAnchor="middle" fontSize="8" fill="#4a5f83" fontFamily="monospace">analyzer</text>
          <text x="122" y="27" textAnchor="middle" fontSize="8" fill="#4a5f83" fontFamily="monospace">text</text>
          <text x="122" y="91" textAnchor="middle" fontSize="8" fill="#0b5e75" fontWeight="bold" fontFamily="monospace">vision</text>
          <text x="204" y="59" textAnchor="middle" fontSize="8" fill="#4a5f83" fontFamily="monospace">fusion</text>
        </svg>
        <p className="mt-2 text-center font-mono text-[10px] font-semibold text-[#0b5e75]">{label} — cited region</p>
      </div>
    </div>
  );
}

function ImagePreview({ scanned, label }: { scanned: boolean; label: string }) {
  return (
    <div>
      <div className="paper-line mb-4 h-2.5 w-1/2" />
      <div className="hl-pulse relative rounded-lg border-2 border-[#0aa6c0]/70 bg-white p-6">
        <span className="absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-[#0aa6c0]" />
        <span className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-[#0aa6c0]" />
        <span className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-[#0aa6c0]" />
        <span className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-[#0aa6c0]" />
        <div className={cn("flex flex-col items-center justify-center py-8", scanned && "opacity-80")}>
          {scanned ? <ScanLine className="w-8 h-8 text-[#7f97bd]" /> : <ImageIcon className="w-8 h-8 text-[#7f97bd]" />}
          <p className="mt-3 font-mono text-[10px] text-[#4a5f83]">{scanned ? "OCR region · 98.2% confidence" : "visual region"}</p>
        </div>
        <p className="text-center font-mono text-[10px] font-semibold text-[#0b5e75]">{label}</p>
      </div>
    </div>
  );
}

/* ------------------------------ preview modal ----------------------------- */

export function EvidencePreviewModal({ ev, onClose }: { ev: Evidence | null; onClose: () => void }) {
  if (!ev) return null;
  const meta = CONTENT_META[ev.contentType];
  const label = ev.section ?? meta.label;

  return (
    <Modal
      open={!!ev}
      onClose={onClose}
      wide
      title={
        <span className="flex items-center gap-2.5">
          Source Page Preview
          <Badge tone="cyan">demo visualization</Badge>
        </span>
      }
    >
      <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="paper relative overflow-hidden rounded-xl border border-[#c9d4e8] p-6 shadow-inner">
          <div className="mb-5 flex items-center justify-between border-b border-[#dbe4f3] pb-3">
            <p className="font-mono text-[11px] font-bold text-[#4a5f83]">Page {ev.page}</p>
            <p className="font-mono text-[10px] text-[#8296b5]">{label}</p>
          </div>
          {ev.contentType === "text" && <TextPreview highlighted={ev.preview} />}
          {ev.contentType === "chart" && <ChartPreview label={label} />}
          {ev.contentType === "table" && <TablePreview label={label} />}
          {ev.contentType === "diagram" && <DiagramPreview label={label} />}
          {(ev.contentType === "image" || ev.contentType === "scanned") && (
            <ImagePreview scanned={ev.contentType === "scanned"} label={label} />
          )}
          <p className="mt-5 text-right font-mono text-[9px] text-[#8296b5]">rendered from mock evidence · not the source file</p>
        </div>

        <div className="space-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Source identifier</p>
            <p className="mt-1.5 break-all rounded-lg border border-line bg-inset px-3 py-2 font-mono text-[11px] text-acc">
              {ev.sourceId}
            </p>
          </div>
          <div className="space-y-2.5 rounded-lg border border-line bg-inset p-4">
            <ScoreBar label="retrieval" value={ev.retrievalScore} />
            <ScoreBar label="reranker" value={ev.rerankerScore} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Evidence preview</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-mut">{ev.preview}</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-ok/25 bg-ok/5 px-3.5 py-2.5">
            <BadgeCheck className="w-4 h-4 shrink-0 text-ok" />
            <p className="text-[12px] text-ink">
              Rank <span className="font-mono font-semibold">#{ev.rank}</span> of the retrieved set — the generated
              answer cites this source.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------ type icon map ----------------------------- */

export const EVIDENCE_ICONS = {
  text: FileText,
  image: ImageIcon,
  table: Table2,
  chart: BarChart3,
  diagram: GitBranch,
  scanned: ScanLine,
} satisfies Record<ContentType, typeof FileText>;
