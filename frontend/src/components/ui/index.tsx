import { useEffect, useRef, useState, type ReactNode, type ComponentType } from "react";
import {
  FileText,
  Image as ImageIcon,
  Table2,
  BarChart3,
  GitBranch,
  ScanLine,
  Eye,
  Layers,
  Loader2,
  X,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import type { ContentType, DocumentStatus, IndexingStatus, PipelineId, QueryType } from "../../types";

/* ------------------------------- utilities ------------------------------- */

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`;
}

export function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

/* ------------------------------ content meta ------------------------------ */

export const CONTENT_META: Record<
  ContentType,
  { label: string; icon: ComponentType<{ className?: string }>; dot: string; text: string }
> = {
  text: { label: "Text", icon: FileText, dot: "bg-acc2", text: "text-acc2" },
  image: { label: "Image", icon: ImageIcon, dot: "bg-warn", text: "text-warn" },
  table: { label: "Table", icon: Table2, dot: "bg-acc", text: "text-acc" },
  chart: { label: "Chart", icon: BarChart3, dot: "bg-vio", text: "text-vio" },
  diagram: { label: "Diagram", icon: GitBranch, dot: "bg-ok", text: "text-ok" },
  scanned: { label: "Scanned", icon: ScanLine, dot: "bg-bad", text: "text-bad" },
};

export const PIPELINE_META: Record<
  PipelineId,
  { label: string; short: string; icon: ComponentType<{ className?: string }>; color: string; desc: string }
> = {
  "text-rag": {
    label: "Text RAG",
    short: "Text",
    icon: FileText,
    color: "var(--acc2)",
    desc: "Semantic + keyword search over structure-aware text chunks",
  },
  "vision-rag": {
    label: "Vision RAG",
    short: "Vision",
    icon: Eye,
    color: "var(--vio)",
    desc: "Figures, diagrams, scans and images via the vision index",
  },
  "table-retrieval": {
    label: "Table Retrieval",
    short: "Table",
    icon: Table2,
    color: "var(--ok)",
    desc: "Table-aware search preserving rows, columns and headers",
  },
  "hybrid-multimodal": {
    label: "Hybrid Multimodal",
    short: "Hybrid",
    icon: Layers,
    color: "var(--acc)",
    desc: "Fuses text, vision and table evidence with hybrid search + reranking",
  },
};

export const QUERY_TYPE_LABEL: Record<QueryType, string> = {
  text: "Text",
  table: "Table",
  chart: "Chart",
  image: "Image",
  diagram: "Diagram",
  "multi-hop": "Multi-hop",
};

/* -------------------------------- primitives ------------------------------ */

export function Card({
  children,
  className,
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-panel shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_10px_30px_-18px_rgba(2,8,20,0.8)]",
        hover && "transition-all duration-300 hover:-translate-y-0.5 hover:border-line2 hover:shadow-[0_18px_40px_-20px_rgba(2,8,20,0.9)]",
        className
      )}
    >
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className,
  disabled,
  loading,
  title,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-acc2 text-white hover:brightness-110 active:scale-[0.98] shadow-[0_8px_24px_-10px_color-mix(in_oklab,var(--acc2)_70%,transparent)]",
    secondary: "bg-panel2 text-ink border border-line hover:border-line2 active:scale-[0.98]",
    outline: "bg-transparent text-ink border border-line2 hover:bg-ink/5 active:scale-[0.98]",
    ghost: "bg-transparent text-mut hover:text-ink hover:bg-ink/5 active:scale-[0.98]",
    danger: "bg-bad/10 text-bad border border-bad/30 hover:bg-bad/20 active:scale-[0.98]",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-[15px] gap-2",
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
  mono = true,
}: {
  children: ReactNode;
  tone?: "neutral" | "cyan" | "blue" | "violet" | "green" | "amber" | "red";
  className?: string;
  mono?: boolean;
}) {
  const tones = {
    neutral: "bg-ink/5 text-mut border-line",
    cyan: "bg-acc/10 text-acc border-acc/25",
    blue: "bg-acc2/10 text-acc2 border-acc2/25",
    violet: "bg-vio/10 text-vio border-vio/25",
    green: "bg-ok/10 text-ok border-ok/25",
    amber: "bg-warn/10 text-warn border-warn/25",
    red: "bg-bad/10 text-bad border-bad/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        mono && "font-mono",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: DocumentStatus }) {
  const map: Record<DocumentStatus, { label: string; cls: string; dot: string; pulse?: boolean }> = {
    processing: { label: "Processing", cls: "text-warn border-warn/30 bg-warn/10", dot: "bg-warn", pulse: true },
    ready: { label: "Ready", cls: "text-ok border-ok/30 bg-ok/10", dot: "bg-ok" },
    failed: { label: "Failed", cls: "text-bad border-bad/30 bg-bad/10", dot: "bg-bad" },
  };
  const m = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium font-mono", m.cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", m.dot, m.pulse && "blink")} />
      {m.label}
    </span>
  );
}

export function IndexingPill({ status }: { status: IndexingStatus }) {
  const map: Record<IndexingStatus, { label: string; cls: string }> = {
    indexed: { label: "Indexed", cls: "text-ok border-ok/30 bg-ok/10" },
    indexing: { label: "Indexing", cls: "text-warn border-warn/30 bg-warn/10" },
    queued: { label: "Queued", cls: "text-mut border-line bg-ink/5" },
    failed: { label: "Index failed", cls: "text-bad border-bad/30 bg-bad/10" },
  };
  const m = map[status];
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono", m.cls)}>
      {m.label}
    </span>
  );
}

export function TypeChip({ type, small }: { type: ContentType; small?: boolean }) {
  const meta = CONTENT_META[type];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-line bg-inset text-mut",
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
      )}
    >
      <Icon className={cn(small ? "w-3 h-3" : "w-3.5 h-3.5", meta.text)} />
      {meta.label}
    </span>
  );
}

export function PipelineBadge({ pipeline, size = "md" }: { pipeline: PipelineId; size?: "sm" | "md" }) {
  const meta = PIPELINE_META[pipeline];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-mono font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      )}
      style={{
        color: meta.color,
        borderColor: `color-mix(in oklab, ${meta.color} 35%, transparent)`,
        background: `color-mix(in oklab, ${meta.color} 10%, transparent)`,
      }}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {meta.label}
    </span>
  );
}

export function QueryTypeBadge({ type }: { type: QueryType }) {
  return (
    <Badge tone={type === "multi-hop" ? "green" : type === "chart" ? "violet" : type === "table" ? "cyan" : "blue"}>
      {QUERY_TYPE_LABEL[type].toUpperCase()} QUERY
    </Badge>
  );
}

export function ProgressBar({ value, tone = "acc" }: { value: number; tone?: "acc" | "ok" | "warn" | "bad" }) {
  const colors = { acc: "bg-acc", ok: "bg-ok", warn: "bg-warn", bad: "bg-bad" };
  return (
    <div className="h-1.5 w-full rounded-full bg-ink/10 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ScoreBar({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase tracking-wider text-faint w-16 shrink-0">{label}</span>
      <div className="h-1 flex-1 rounded-full bg-ink/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-acc2 to-acc growx"
          style={{ width: `${(value ?? 0) * 100}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-mut w-9 text-right">{value?.toFixed(2) ?? "—"}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="relative group/tip inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-panel2 px-2.5 py-1.5 text-[11px] text-ink opacity-0 shadow-xl transition-opacity duration-200 group-hover/tip:opacity-100">
        {label}
      </span>
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-[#02060f]/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "anim-rise relative w-full rounded-t-2xl sm:rounded-2xl border border-line bg-panel shadow-2xl max-h-[92vh] overflow-y-auto",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel/95 backdrop-blur px-5 py-4">
          <div className="font-display font-semibold text-ink">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-mut hover:bg-ink/5 hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-panel/50 px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-panel2 text-mut">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-mut">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------------------------- toasts -------------------------------- */

type Toast = { id: number; message: string; tone: "ok" | "bad" | "info" };
let toastListeners: Array<(t: Toast) => void> = [];

export function toast(message: string, tone: Toast["tone"] = "ok") {
  toastListeners.forEach((l) => l({ id: Date.now() + Math.random(), message, tone }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const listener = (t: Toast) => {
      setItems((p) => [...p, t]);
      setTimeout(() => setItems((p) => p.filter((i) => i.id !== t.id)), 3800);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="anim-rise pointer-events-auto flex items-center gap-3 rounded-lg border border-line bg-panel2 px-4 py-3 shadow-2xl"
        >
          {t.tone === "ok" && <CheckCircle2 className="w-4 h-4 shrink-0 text-ok" />}
          {t.tone === "bad" && <XCircle className="w-4 h-4 shrink-0 text-bad" />}
          {t.tone === "info" && <Info className="w-4 h-4 shrink-0 text-acc" />}
          <p className="text-sm text-ink">{t.message}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------- logo ---------------------------------- */

export function LogoMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--panel2)" stroke="var(--line2)" strokeWidth="1" />
      <path d="M9 8h9a7 7 0 0 1 0 14h-9z" fill="none" stroke="var(--acc)" strokeWidth="2.4" />
      <circle cx="23" cy="23" r="3.2" fill="var(--acc2)" />
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className={compact ? "w-7 h-7" : "w-8 h-8"} />
      {!compact && (
        <span className="font-display text-[17px] font-bold tracking-tight text-ink">
          DocuMind<span className="text-acc"> AI</span>
        </span>
      )}
    </span>
  );
}

/* ----------------------------- scroll reveal ------------------------------ */

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("reveal", className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
