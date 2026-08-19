import { useEffect, useRef, useState, type DragEvent } from "react";
import { FileText, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../../services/api";
import type { Document, UploadStage } from "../../types";
import { ProgressBar, cn, toast, useClickOutside } from "../ui";

/**
 * Drag & drop PDF upload with a simulated processing pipeline.
 * Reused on the Documents dashboard and inside the Assistant sources panel.
 */
export default function UploadZone({
  onUploaded,
  compact = false,
}: {
  onUploaded?: (d: Document) => void;
  compact?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [result, setResult] = useState<Document | null>(null);
  const [error, setError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const zoneRef = useClickOutside(() => {
    /* keep panel open */
  });

  useEffect(() => {
    if (!fileName) return;
    let cancelled = false;
    setStage({ label: "Uploading document...", progress: 8 });
    const pages = 18 + Math.floor(Math.random() * 40);
    api
      .uploadDocument(fileName, pages, (s: UploadStage) => {
        if (!cancelled) setStage(s);
      })
      .then((doc) => {
        if (cancelled) return;
        setResult(doc);
        setStage(null);
        if (doc.status === "failed") {
          setError(true);
          toast("Analysis failed for the simulated file.", "bad");
        } else {
          toast(`${doc.name} analyzed and indexed.`);
          onUploaded?.(doc);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fileName, onUploaded]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (stage) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      setRejected("Only PDF files are supported in this demo.");
      return;
    }
    setRejected(null);
    setResult(null);
    setError(false);
    setFileName(file.name);
  };

  const reset = () => {
    setFileName(null);
    setResult(null);
    setError(false);
    setStage(null);
  };

  return (
    <div
      ref={zoneRef}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all duration-300",
        dragOver
          ? "border-acc bg-acc/5 scale-[1.005]"
          : "border-line bg-panel hover:border-acc/40 hover:bg-acc/[0.02]",
        compact ? "px-5 py-6" : "px-6 py-12"
      )}
    >
      {!fileName && !result && (
        <div className="flex flex-col items-center text-center">
          <span
            className={cn(
              "flex items-center justify-center rounded-xl border border-line bg-panel2 transition-transform duration-300",
              compact ? "h-11 w-11" : "h-14 w-14",
              dragOver && "scale-110 border-acc/50"
            )}
          >
            <FileText className={cn("text-acc2", compact ? "w-5 h-5" : "w-6 h-6")} />
          </span>
          <p className={cn("mt-4 font-display font-semibold text-ink", compact ? "text-sm" : "text-lg")}>
            Drag & drop your PDF here
          </p>
          <p className="mt-1 text-[13px] text-mut">or</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-2 rounded-lg border border-acc2/40 bg-acc2/10 px-4 py-2 text-sm font-medium text-acc2 transition-all hover:bg-acc2/20 active:scale-[0.98]"
          >
            Browse Files
          </button>
          <p className="mt-4 font-mono text-[11px] text-faint">
            Max 25 MB · PDF only · pages, tables, charts & scans are auto-detected
          </p>
          {rejected && (
            <p className="anim-rise mt-3 inline-flex items-center gap-2 rounded-md border border-bad/30 bg-bad/10 px-3 py-1.5 text-xs text-bad">
              <XCircle className="w-3.5 h-3.5" /> {rejected}
            </p>
          )}
        </div>
      )}

      {fileName && stage && (
        <div className="flex flex-col items-center text-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-acc/30 bg-acc/10">
            <FileText className="w-5 h-5 text-acc animate-pulse" />
          </span>
          <p className="mt-4 max-w-full truncate px-4 font-mono text-sm text-ink">{fileName}</p>
          <p className="mt-1 font-mono text-xs text-acc">{stage.label}</p>
          <div className="mt-4 w-full max-w-sm">
            <ProgressBar value={stage.progress} />
          </div>
          <p className="mt-2 font-mono text-[11px] text-faint">{stage.progress}%</p>
        </div>
      )}

      {result && !stage && (
        <div className="flex flex-col items-center text-center">
          <span
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl border",
              error ? "border-bad/30 bg-bad/10" : "border-ok/30 bg-ok/10"
            )}
          >
            {error ? (
              <XCircle className="w-5 h-5 text-bad" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-ok" />
            )}
          </span>
          <p className="mt-4 max-w-full truncate px-4 font-mono text-sm text-ink">{result.name}</p>
          {error ? (
            <p className="mt-2 max-w-md text-xs leading-relaxed text-bad">{result.error}</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { k: "pages", v: result.pages },
                { k: "charts", v: result.counts.chart ?? 0 },
                { k: "tables", v: result.counts.table ?? 0 },
                { k: "diagrams", v: result.counts.diagram ?? 0 },
              ].map((s) => (
                <span
                  key={s.k}
                  className="rounded-lg border border-line bg-panel2 px-3 py-2 font-mono text-[11px] text-mut"
                >
                  <span className="block text-base font-semibold text-ink">{s.v}</span>
                  {s.k}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={reset}
              className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-mut transition-colors hover:border-line2 hover:text-ink"
            >
              Upload another
            </button>
            {!error && onUploaded === undefined && (
              <span className="rounded-lg border border-ok/30 bg-ok/10 px-4 py-2 font-mono text-[11px] text-ok">
                ready in workspace
              </span>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        aria-label="Choose a PDF file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (!/\.pdf$/i.test(f.name)) {
            setRejected("Only PDF files are supported in this demo.");
            return;
          }
          setRejected(null);
          setResult(null);
          setError(false);
          setFileName(f.name);
          e.target.value = "";
        }}
      />
    </div>
  );
}
