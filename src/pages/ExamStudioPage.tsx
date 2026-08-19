import { useMemo, useState } from "react";
import {
  GraduationCap,
  FileText,
  Wand2,
  KeyRound,
  EyeOff,
  Download,
  RefreshCw,
  Check,
  CheckCircle2,
  ListChecks,
  Focus,
  AlertTriangle,
} from "lucide-react";
import { api } from "../services/api";
import { defaultDocumentId } from "../config/branding";
import type {
  ExamConfig,
  ExamDifficulty,
  ExamQuestion,
  ExamQuestionType,
  GeneratedExam,
  UploadStage,
} from "../types";
import { Badge, Button, Card, ProgressBar, Tip, cn, toast } from "../components/ui";

const TYPE_META: Record<ExamQuestionType, { label: string; short: string }> = {
  mcq: { label: "Multiple Choice", short: "MCQ" },
  truefalse: { label: "True / False", short: "T/F" },
  short: { label: "Short Answer", short: "SHORT" },
};

const DIFF_META: Record<ExamDifficulty, { label: string; cls: string }> = {
  easy: { label: "Easy", cls: "text-ok border-ok/30 bg-ok/10" },
  medium: { label: "Medium", cls: "text-warn border-warn/30 bg-warn/10" },
  hard: { label: "Hard", cls: "text-vio border-vio/30 bg-vio/10" },
};

function OptionRow({
  letter,
  text,
  correct,
  revealed,
}: {
  letter: string;
  text: string;
  correct: boolean;
  revealed: boolean;
}) {
  const isCorrect = revealed && correct;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-all duration-300",
        isCorrect
          ? "border-ok/40 bg-ok/5"
          : "border-line bg-inset",
        revealed && !correct && "opacity-70"
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-semibold",
          isCorrect ? "border-ok/40 bg-ok/15 text-ok" : "border-line bg-panel2 text-mut"
        )}
      >
        {letter}
      </span>
      <span className={cn("flex-1 text-[13px]", isCorrect ? "font-medium text-ink" : "text-mut")}>{text}</span>
      {isCorrect && <Check className="w-4 h-4 shrink-0 text-ok" />}
    </div>
  );
}

function QuestionCard({ q, revealed, delay }: { q: ExamQuestion; revealed: boolean; delay: number }) {
  const diff = DIFF_META[q.difficulty];
  const letters = ["A", "B", "C", "D", "E"];
  return (
    <Card className="anim-rise p-5 sm:p-6" hover>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-acc2/30 bg-acc2/10 font-mono text-[12px] font-bold text-acc2">
          {q.index}
        </span>
        <Badge tone="blue">{TYPE_META[q.type].short}</Badge>
        <span className={cn("rounded-md border px-2 py-0.5 font-mono text-[10px]", diff.cls)}>
          {diff.label.toUpperCase()}
        </span>
        <Tip label="Where this question is grounded in the source">
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-line bg-inset px-2 py-1 font-mono text-[10px] text-faint">
            <FileText className="w-3 h-3 text-acc" />
            Page {q.source.page} · {q.source.section}
          </span>
        </Tip>
      </div>

      <p className="mt-4 text-[15px] font-medium leading-relaxed text-ink">{q.prompt}</p>

      {q.type !== "short" && q.options && (
        <div className="mt-4 space-y-2">
          {q.options.map((opt, i) => (
            <OptionRow
              key={i}
              letter={q.type === "truefalse" ? (i === 0 ? "T" : "F") : letters[i]}
              text={opt}
              correct={i === q.correctIndex}
              revealed={revealed}
            />
          ))}
        </div>
      )}

      {q.type === "short" && (
        <div
          className={cn(
            "mt-4 rounded-lg border border-dashed px-4 py-3.5 transition-all duration-300",
            revealed ? "border-ok/40 bg-ok/5" : "border-line bg-inset"
          )}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Model answer</p>
          {revealed ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{q.answer}</p>
          ) : (
            <p className="mt-1.5 text-[13px] italic text-faint">Hidden — reveal the answer key</p>
          )}
        </div>
      )}

      {revealed && q.explanation && (
        <p className="anim-rise mt-3.5 rounded-lg border border-line bg-panel2/60 px-4 py-3 text-[12px] leading-relaxed text-mut">
          <span className="font-mono text-[10px] uppercase tracking-wider text-acc">why · </span>
          {q.explanation}
        </p>
      )}
    </Card>
  );
}

export default function ExamStudioPage() {
  const readyDocs = useMemo(() => api.getDocumentsSync().filter((d) => d.status === "ready"), []);

  const [docId, setDocId] = useState(() =>
    readyDocs.some((d) => d.id === defaultDocumentId) ? defaultDocumentId : readyDocs[0]?.id ?? defaultDocumentId
  );
  const [count, setCount] = useState(6);
  const [types, setTypes] = useState<ExamQuestionType[]>(["mcq", "truefalse", "short"]);
  const [difficulty, setDifficulty] = useState<ExamDifficulty>("medium");
  const [focus, setFocus] = useState("");
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [showKey, setShowKey] = useState(false);

  const running = stage !== null;
  const selectedDoc = readyDocs.find((d) => d.id === docId);

  const toggleType = (t: ExamQuestionType) => {
    setTypes((prev) => {
      if (prev.includes(t)) {
        if (prev.length === 1) {
          toast("Keep at least one question format selected.", "info");
          return prev;
        }
        return prev.filter((x) => x !== t);
      }
      return [...prev, t];
    });
  };

  const generate = async () => {
    if (running) return;
    if (!selectedDoc) {
      toast("Upload and index a document first.", "bad");
      return;
    }
    const config: ExamConfig = {
      documentId: docId,
      count,
      types,
      difficulty,
      focus: focus.trim() || undefined,
    };
    setExam(null);
    setShowKey(false);
    setStage({ label: "Starting...", progress: 4 });
    const result = await api.generateExam(config, setStage);
    setStage(null);
    setExam(result);
    toast(`Exam generated — ${result.questions.length} questions grounded to ${selectedDoc.name}.`);
  };

  return (
    <div className="space-y-6">
      <div className="anim-rise flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-vio/30 bg-vio/10">
              <GraduationCap className="w-5 h-5 text-vio" />
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">Exam Studio</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-mut">
            Turn any indexed source into an exam — questions and a grounded answer key, for professors, TAs, and
            self-study.
          </p>
        </div>
        <Badge tone="violet">NEW · DEMO GENERATION</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* ------------------------------ config ------------------------------ */}
        <Card className="h-fit p-6 lg:sticky lg:top-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Exam configuration</p>

          <div className="mt-4">
            <label htmlFor="exam-source" className="mb-1.5 block text-[12px] font-medium text-mut">
              Source document
            </label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-acc2" />
              <select
                id="exam-source"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                disabled={running}
                className="w-full appearance-none rounded-lg border border-line bg-inset py-2.5 pl-9 pr-8 text-[13px] text-ink outline-none transition-colors focus:border-acc/50 disabled:opacity-50"
              >
                {readyDocs.length === 0 && <option value="">No ready documents</option>}
                {readyDocs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.pages} pages
                  </option>
                ))}
              </select>
            </div>
            {readyDocs.length === 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-warn">
                <AlertTriangle className="mt-0.5 w-3 h-3 shrink-0" /> Upload a document from the workspace first.
              </p>
            )}
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="exam-count" className="text-[12px] font-medium text-mut">
                Number of questions
              </label>
              <span className="rounded-md border border-acc/30 bg-acc/10 px-2 py-0.5 font-mono text-[12px] font-semibold text-acc">
                {count}
              </span>
            </div>
            <input
              id="exam-count"
              type="range"
              min={4}
              max={12}
              value={count}
              disabled={running}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-[var(--acc)]"
            />
            <div className="flex justify-between font-mono text-[10px] text-faint">
              <span>4</span>
              <span>12</span>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-1.5 text-[12px] font-medium text-mut">Question formats</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_META) as ExamQuestionType[]).map((t) => {
                const active = types.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    disabled={running}
                    aria-pressed={active}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-[12px] font-medium transition-all active:scale-95",
                      active
                        ? "border-acc2/40 bg-acc2/10 text-acc2"
                        : "border-line bg-inset text-faint hover:text-mut"
                    )}
                  >
                    {TYPE_META[t].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-1.5 text-[12px] font-medium text-mut">Difficulty</p>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-line bg-inset p-1.5">
              {(Object.keys(DIFF_META) as ExamDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  disabled={running}
                  aria-pressed={difficulty === d}
                  className={cn(
                    "rounded-md py-1.5 text-[12px] font-medium transition-all",
                    difficulty === d ? "bg-panel2 text-ink shadow border border-line" : "text-faint hover:text-mut"
                  )}
                >
                  {DIFF_META[d].label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="exam-focus" className="mb-1.5 block text-[12px] font-medium text-mut">
              Focus topic <span className="text-faint">(optional)</span>
            </label>
            <div className="relative">
              <Focus className="pointer-events-none absolute left-3 top-1/2 w-3.5 h-3.5 -translate-y-1/2 text-faint" />
              <input
                id="exam-focus"
                value={focus}
                disabled={running}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="e.g. retrieval results"
                className="w-full rounded-lg border border-line bg-inset py-2.5 pl-9 pr-3 text-[13px] text-ink placeholder:text-faint outline-none transition-colors focus:border-acc/50 disabled:opacity-50"
              />
            </div>
          </div>

          <Button className="mt-6 w-full" size="lg" onClick={generate} loading={running} disabled={readyDocs.length === 0}>
            {running ? "Generating..." : exam ? "Regenerate exam" : "Generate exam"}
            {!running && <Wand2 className="w-4 h-4" />}
          </Button>

          <p className="mt-3.5 text-center font-mono text-[10px] leading-relaxed text-faint">
            demo generation · questions are drafted from the document's indexed evidence
          </p>
        </Card>

        {/* ------------------------------ results ------------------------------ */}
        <div className="min-w-0 space-y-4">
          {running && stage && (
            <Card className="anim-rise p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-vio/30 bg-vio/10">
                  <Wand2 className="w-4 h-4 animate-pulse text-vio" />
                </span>
                <div className="flex-1">
                  <p className="font-display text-sm font-semibold text-ink">Drafting your exam</p>
                  <p className="font-mono text-[11px] text-vio">{stage.label}</p>
                </div>
                <span className="font-mono text-[12px] text-faint">{stage.progress}%</span>
              </div>
              <div className="mt-4">
                <ProgressBar value={stage.progress} tone="acc" />
              </div>
              <div className="mt-4 space-y-2">
                {[
                  "Analyzing source document",
                  "Extracting key concepts",
                  "Drafting questions",
                  "Writing answer key",
                  "Grounding questions to evidence",
                ].map((s, i) => {
                  const done = stage.progress > (i + 1) * 18;
                  const active = !done && stage.progress > i * 18;
                  return (
                    <div key={s} className="flex items-center gap-2.5">
                      {done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
                      ) : (
                        <span className={cn("w-3.5 h-3.5 rounded-full border", active ? "border-vio blink" : "border-line")} />
                      )}
                      <span className={cn("text-[12px]", done ? "text-mut line-through" : active ? "text-ink" : "text-faint")}>
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {!running && !exam && (
            <Card className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-panel2">
                <ListChecks className="w-6 h-6 text-faint" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold text-ink">No exam yet</h3>
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-mut">
                Pick a source, choose formats and difficulty, then generate. Every question will point back to the
                exact page it came from.
              </p>
            </Card>
          )}

          {!running && exam && (
            <>
              <Card className="anim-rise p-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Generated exam</p>
                    <p className="mt-0.5 truncate font-display text-base font-semibold text-ink">{exam.documentName}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{exam.questions.length} QUESTIONS</Badge>
                    <Badge tone="neutral">{exam.config.types.map((t) => TYPE_META[t].short).join(" + ")}</Badge>
                    <span className={cn("rounded-md border px-2 py-0.5 font-mono text-[10px]", DIFF_META[exam.config.difficulty].cls)}>
                      {DIFF_META[exam.config.difficulty].label.toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Tip label={showKey ? "Hide answers & explanations" : "Reveal answers & explanations"}>
                      <Button variant={showKey ? "secondary" : "outline"} size="sm" onClick={() => setShowKey((v) => !v)}>
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
                        {showKey ? "Hide key" : "Answer key"}
                      </Button>
                    </Tip>
                    <Tip label="Export exam + key (demo)">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast("Exam exported with answer key — demo action only.", "info")}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </Tip>
                  </div>
                </div>
                {exam.config.focus && (
                  <p className="mt-3 font-mono text-[11px] text-faint">
                    focus: <span className="text-vio">{exam.config.focus}</span>
                  </p>
                )}
              </Card>

              {exam.questions.map((q, i) => (
                <QuestionCard key={q.id} q={q} revealed={showKey} delay={i * 60} />
              ))}

              <p className="pb-2 text-center font-mono text-[10px] text-faint">
                every question is grounded to a source page · answers are hidden until you reveal the key
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
