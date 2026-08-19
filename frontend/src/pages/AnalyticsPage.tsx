import { useEffect, useState } from "react";
import { Activity, Server, TrendingDown, TrendingUp, CheckCircle2, ShieldX, XCircle } from "lucide-react";
import { api } from "../services/api";
import type { AnalyticsBundle, QueryStatus, RecentQueryRow } from "../types";
import { Badge, Card, PipelineBadge, QueryTypeBadge, Skeleton, cn } from "../components/ui";
import { Donut, HBarRow, Ring, Spark } from "../components/charts";

function StatusBadge({ status }: { status: QueryStatus }) {
  if (status === "answered")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok/10 px-2 py-1 font-mono text-[10px] text-ok">
        <CheckCircle2 className="w-3 h-3" /> ANSWERED
      </span>
    );
  if (status === "insufficient_evidence")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-warn/30 bg-warn/10 px-2 py-1 font-mono text-[10px] text-warn">
        <ShieldX className="w-3 h-3" /> INSUFFICIENT EVIDENCE
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-bad/30 bg-bad/10 px-2 py-1 font-mono text-[10px] text-bad">
      <XCircle className="w-3 h-3" /> FAILED
    </span>
  );
}

function RecentQueryTable({ rows }: { rows: RecentQueryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead>
          <tr className="border-b border-line">
            {["Question", "Query Type", "Pipeline", "Evidence", "Latency", "Status", "When"].map((h) => (
              <th key={h} className="px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-ink/5">
              <td className="max-w-[300px] px-4 py-3.5">
                <p className="truncate text-[13px] text-ink" title={r.question}>{r.question}</p>
              </td>
              <td className="px-4 py-3.5"><QueryTypeBadge type={r.queryType} /></td>
              <td className="px-4 py-3.5"><PipelineBadge pipeline={r.pipeline} size="sm" /></td>
              <td className="px-4 py-3.5 font-mono text-[12px] text-mut">{r.evidenceCount} src</td>
              <td className="px-4 py-3.5 font-mono text-[12px] text-mut">{(r.latencyMs / 1000).toFixed(2)} s</td>
              <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-3.5 font-mono text-[11px] text-faint">{r.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsBundle | null>(null);

  useEffect(() => {
    let live = true;
    api.getAnalytics().then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, []);

  const ringColors = ["var(--acc)", "var(--acc2)", "var(--vio)", "var(--ok)", "var(--acc)", "var(--warn)"];

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-16" />
              <Skeleton className="mt-3 h-9 w-full" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="h-72 p-6"><Skeleton className="h-full w-full" /></Card>
          <Card className="h-72 p-6"><Skeleton className="h-full w-full" /></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">Analytics & Evaluation</h1>
          <p className="mt-1.5 text-sm text-mut">Retrieval quality, pipeline usage, latency and system health.</p>
        </div>
        <Badge tone="amber">
          Sample Evaluation · demo data until backend is connected
        </Badge>
      </div>

      {/* overview */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data.overview.map((m, i) => (
          <Card key={m.label} className="group p-5 transition-colors hover:border-line2" >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-mut">{m.label}</p>
              {i === 0 ? (
                <TrendingUp className="w-4 h-4 text-ok" aria-label="query volume trending up" />
              ) : (
                <TrendingDown className="w-4 h-4 text-ok" aria-label="latency trending down" />
              )}
            </div>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">{m.value}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">{m.hint}</p>
            <div className="mt-3" style={{ animationDelay: `${i * 80}ms` }}>
              <Spark points={m.trend} color={i === 0 ? "var(--acc2)" : "var(--acc)"} />
            </div>
          </Card>
        ))}
      </div>

      {/* retrieval quality */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Retrieval & Answer Quality</h2>
          <span className="font-mono text-[11px] text-faint">sample evaluation · n=348 queries</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {data.quality.map((q, i) => (
            <Card key={q.label} hover className="flex flex-col items-center p-5 text-center">
              <Ring value={q.value} color={ringColors[i % ringColors.length]} size={86} stroke={7}>
                <span className="font-display text-lg font-bold text-ink">{Math.round(q.value * 100)}</span>
                <span className="font-mono text-[9px] text-faint">/ 100</span>
              </Ring>
              <p className="mt-3 text-[12px] font-semibold text-ink">{q.label}</p>
              <p className="mt-1 font-mono text-[10px] leading-snug text-faint">{q.note}</p>
              <p className="mt-2 font-mono text-[10px] text-mut">
                target {Math.round(q.target * 100)} ·{" "}
                <span className={q.value >= q.target ? "text-ok" : "text-warn"}>{q.value >= q.target ? "met" : "watch"}</span>
              </p>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* query type distribution */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel2">
                <Activity className="w-4 h-4 text-acc2" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-ink">Query Type Distribution</h3>
                <p className="text-[12px] text-faint">how questions were classified by the query analyzer</p>
              </div>
            </div>
            <Badge tone="blue">sample</Badge>
          </div>
          <div className="mt-6 space-y-4">
            {data.queryTypes.map((t) => (
              <HBarRow key={t.label} label={t.label} value={t.value} max={Math.max(...data.queryTypes.map((x) => x.value))} color={t.color} />
            ))}
          </div>
        </Card>

        {/* pipeline usage */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel2">
                <Server className="w-4 h-4 text-acc" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-ink">Pipeline Usage</h3>
                <p className="text-[12px] text-faint">adaptive router decisions across all queries</p>
              </div>
            </div>
            <Badge tone="cyan">sample</Badge>
          </div>
          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
            <Donut
              items={data.pipelines}
              center={
                <>
                  <span className="font-display text-2xl font-bold text-ink">348</span>
                  <span className="font-mono text-[10px] uppercase text-faint">routed</span>
                </>
              }
            />
            <div className="w-full flex-1 space-y-2.5">
              {data.pipelines.map((p) => (
                <div key={p.label} className="flex items-center justify-between rounded-lg border border-line bg-inset px-3.5 py-2.5">
                  <span className="flex items-center gap-2.5 text-[13px] text-ink">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
                    {p.label}
                  </span>
                  <span className="font-mono text-[12px] text-mut">
                    {p.value} · {Math.round((p.value / 348) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* recent queries */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">Recent Queries</h3>
            <p className="text-[12px] text-faint">latest retrieval round-trips with evidence and latency</p>
          </div>
          <Badge tone="amber">demo log</Badge>
        </div>
        <RecentQueryTable rows={data.recentQueries} />
      </Card>

      {/* system status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-ok/30 bg-ok/10">
              <Server className="w-4 h-4 text-ok" />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">System Status</h3>
              <p className="text-[12px] text-faint">frontend mock statuses — wired to health checks after integration</p>
            </div>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-3 py-1 font-mono text-[11px] text-ok")}>
            <span className="w-1.5 h-1.5 rounded-full bg-ok blink" /> ALL READY
          </span>
        </div>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {data.services.map((s, i) => (
            <div
              key={s.name}
              className="anim-rise flex items-center justify-between rounded-lg border border-line bg-inset px-4 py-3 transition-colors hover:border-line2"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-ok" />
                <div>
                  <p className="text-[13px] font-medium text-ink">{s.name}</p>
                  <p className="font-mono text-[10px] text-faint">{s.detail}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-[11px] font-semibold text-ok">Ready</p>
                {s.latencyMs !== undefined && <p className="font-mono text-[10px] text-faint">{s.latencyMs} ms</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
