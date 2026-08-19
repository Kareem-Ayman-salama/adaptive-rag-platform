import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  Route as RouteIcon,
  BadgeCheck,
  Gauge,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { auth } from "../services/auth";
import { branding, nav } from "../config/branding";
import { Badge, Button, Logo, cn, toast } from "../components/ui";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setFieldErr({});
  };

  const validate = () => {
    const fe: Record<string, string> = {};
    if (mode === "signup" && name.trim().length < 2) fe.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) fe.email = "Enter a valid email address.";
    if (password.length < 6) fe.password = "Password must be at least 6 characters.";
    setFieldErr(fe);
    return Object.keys(fe).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const user =
        mode === "signin"
          ? await auth.signIn(email, password)
          : await auth.signUp(name, email, password);
      toast(`Welcome${mode === "signup" ? " aboard" : " back"}, ${user.name.split(" ")[0]}.`);
      navigate(nav.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const useDemo = async () => {
    setError(null);
    setBusy(true);
    try {
      await auth.signIn("demo@documind.ai", "demo1234");
      toast("Signed in with the demo account.");
      navigate(nav.documents);
    } catch {
      setError("Demo account unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = (bad?: string) =>
    cn(
      "h-11 w-full rounded-lg border bg-inset px-3.5 text-sm text-ink placeholder:text-faint outline-none transition-all",
      bad
        ? "border-bad/50 focus:border-bad"
        : "border-line focus:border-acc/60 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--acc)_15%,transparent)]"
    );

  const features = [
    { icon: RouteIcon, title: "Adaptive routing", desc: "Text, vision, table or hybrid — chosen per query" },
    { icon: BadgeCheck, title: "Evidence grounding", desc: "Every answer links to ranked page-level sources" },
    { icon: Gauge, title: "Built-in evaluation", desc: "Hit rate, faithfulness, citations and latency" },
  ];

  return (
    <div className="relative min-h-screen bg-page">
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_15%_15%,color-mix(in_oklab,var(--acc2)_12%,transparent),transparent_70%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_90%_90%,color-mix(in_oklab,var(--vio)_9%,transparent),transparent_70%)]" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* brand side */}
          <div className="hidden flex-col justify-center lg:flex">
            <Logo />
            <h1 className="mt-8 font-display text-4xl xl:text-5xl font-bold leading-[1.08] tracking-tight text-ink">
              Understand documents
              <br />
              beyond <span className="text-acc">text.</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-mut">{branding.description}</p>

            <div className="mt-10 space-y-3">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="anim-rise flex items-center gap-4 rounded-xl border border-line bg-panel/70 px-5 py-4"
                  style={{ animationDelay: `${i * 110}ms` }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-acc/25 bg-acc/10">
                    <f.icon className="w-4 h-4 text-acc" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{f.title}</p>
                    <p className="text-[12px] text-mut">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="anim-rise mt-10 flex items-center gap-2.5" style={{ animationDelay: "380ms" }}>
              <Sparkles className="w-4 h-4 text-warn" />
              <p className="font-mono text-[11px] text-faint">{branding.mode}</p>
            </div>
          </div>

          {/* form side */}
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <Logo />
            </div>

            <div className="anim-rise rounded-2xl border border-line bg-panel p-6 sm:p-8 shadow-[0_30px_80px_-40px_rgba(2,8,20,0.9)]">
              <div className="flex rounded-lg border border-line bg-inset p-1">
                {(["signin", "signup"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={cn(
                      "h-9 flex-1 rounded-md text-[13px] font-medium transition-all",
                      mode === m ? "bg-panel2 text-ink shadow border border-line" : "text-mut hover:text-ink border border-transparent"
                    )}
                  >
                    {m === "signin" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              <h2 className="mt-6 font-display text-xl font-bold text-ink">
                {mode === "signin" ? "Welcome back" : "Start your workspace"}
              </h2>
              <p className="mt-1 text-[13px] text-mut">
                {mode === "signin"
                  ? "Sign in to your document intelligence workspace."
                  : "One account, all your documents — indexed and queryable."}
              </p>

              {error && (
                <div className="anim-rise mt-4 flex items-start gap-2.5 rounded-lg border border-bad/30 bg-bad/10 px-3.5 py-3">
                  <AlertCircle className="mt-0.5 w-4 h-4 shrink-0 text-bad" />
                  <p className="text-[13px] text-bad">{error}</p>
                </div>
              )}

              <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
                {mode === "signup" && (
                  <div>
                    <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-mut">
                      Full name
                    </label>
                    <div className="relative">
                      <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-faint" />
                      <input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ada Lovelace"
                        className={cn(inputCls(fieldErr.name), "pl-10")}
                        autoComplete="name"
                      />
                    </div>
                    {fieldErr.name && <p className="mt-1 text-[11px] text-bad">{fieldErr.name}</p>}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-mut">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-faint" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className={cn(inputCls(fieldErr.email), "pl-10")}
                      autoComplete="email"
                    />
                  </div>
                  {fieldErr.email && <p className="mt-1 text-[11px] text-bad">{fieldErr.email}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-mut">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-faint" />
                    <input
                      id="password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                      className={cn(inputCls(fieldErr.password), "pl-10 pr-10")}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-ink"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErr.password && <p className="mt-1 text-[11px] text-bad">{fieldErr.password}</p>}
                </div>

                <Button type="submit" size="lg" className="w-full" loading={busy}>
                  {mode === "signin" ? "Sign in" : "Create account"} <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <div className="fade-rule my-5" />

              <div className="rounded-lg border border-acc/20 bg-acc/5 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-acc">Demo account</p>
                    <p className="mt-1 font-mono text-[11px] text-mut">
                      demo@documind.ai · demo1234
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={useDemo} disabled={busy}>
                    Use it
                  </Button>
                </div>
              </div>

              <p className="mt-5 text-center text-[11px] leading-relaxed text-faint">
                Accounts are stored locally in this demo build.
                <br />
                <Badge tone="amber">Frontend demo — no server required</Badge>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
