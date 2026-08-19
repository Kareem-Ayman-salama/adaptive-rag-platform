import { useEffect, useState, type ComponentType } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  GraduationCap,
  Settings2,
  FileText,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  RotateCcw,
  LogOut,
} from "lucide-react";
import { api, DOCS_CHANGED_EVENT } from "../../services/api";
import { auth, initialsOf, type AuthUser } from "../../services/auth";
import { branding, defaultDocumentId, nav } from "../../config/branding";
import type { Document } from "../../types";
import { Badge, Button, Logo, LogoMark, Modal, Tip, cn, toast, useClickOutside } from "../ui";

function useTheme() {
  const [theme, setTheme] = useState<string>(
    () => document.documentElement.getAttribute("data-theme") || "dark"
  );
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("dm-theme", next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  };
  return { theme, toggle };
}

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

function SidebarContent({
  collapsed,
  docs,
  user,
  onNavigate,
  onSettings,
  onSignOut,
}: {
  collapsed: boolean;
  docs: Document[];
  user: AuthUser | null;
  onNavigate?: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}) {
  const items: NavItem[] = [
    { to: nav.documents, label: "Overview", icon: LayoutDashboard },
    { to: nav.assistantFor(defaultDocumentId), label: "Assistant", icon: MessageSquare },
    { to: nav.exams, label: "Exam Studio", icon: GraduationCap },
    { to: nav.analytics, label: "Analytics", icon: BarChart3 },
  ];

  const linkCls = (active: boolean) =>
    cn(
      "group flex items-center gap-3 rounded-lg px-3 h-10 text-sm font-medium transition-all duration-200",
      active
        ? "bg-acc2/10 text-acc2 border border-acc2/25"
        : "text-mut border border-transparent hover:text-ink hover:bg-ink/5",
      collapsed && "justify-center px-0"
    );

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 items-center border-b border-line", collapsed ? "justify-center" : "px-5")}>
        {collapsed ? <LogoMark className="w-8 h-8" /> : <Logo />}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.to === nav.documents} onClick={onNavigate}>
              {({ isActive }) => {
                const link = (
                  <span className={linkCls(isActive)}>
                    <it.icon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && it.label}
                  </span>
                );
                return collapsed ? <Tip label={it.label}>{link}</Tip> : link;
              }}
            </NavLink>
          ))}
        </div>

        {!collapsed && (
          <div className="mt-6">
            <p className="px-3 text-[10px] font-mono uppercase tracking-[0.14em] text-faint">Documents</p>
            <div className="mt-2 space-y-0.5">
              {docs.slice(0, 5).map((d) => (
                <NavLink
                  key={d.id}
                  to={nav.workspaceFor(d.id)}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-lg px-3 h-9 text-[13px] transition-colors",
                      isActive ? "bg-ink/5 text-ink" : "text-mut hover:text-ink hover:bg-ink/5"
                    )
                  }
                >
                  <FileText className={cn("w-3.5 h-3.5 shrink-0", d.status === "failed" ? "text-bad" : "text-faint")} />
                  <span className="truncate">{d.name.replace(/\.pdf$/i, "")}</span>
                </NavLink>
              ))}
              {docs.length === 0 && <p className="px-3 py-2 text-xs text-faint">No documents yet</p>}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-line p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-2.5 rounded-lg border border-line bg-inset px-3 py-2.5">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-ok opacity-60 blink" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-ok" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-ink leading-tight">All systems ready</p>
              <p className="text-[10px] font-mono text-faint">demo services · mock</p>
            </div>
          </div>
        )}

        <button
          onClick={onSettings}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 h-10 text-sm text-mut hover:text-ink hover:bg-ink/5 transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <Settings2 className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && "Settings"}
        </button>

        {user && (
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-lg border border-line bg-inset px-2.5 py-2.5",
              collapsed && "justify-center border-0 bg-transparent px-0"
            )}
          >
            {collapsed ? (
              <Tip label={`${user.name} — sign out`}>
                <button onClick={onSignOut} aria-label="Sign out" className="rounded-full transition-transform hover:scale-105">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-acc2 to-vio text-[11px] font-bold text-white">
                    {initialsOf(user.name)}
                  </span>
                </button>
              </Tip>
            ) : (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-acc2 to-vio text-[11px] font-bold text-white">
                  {initialsOf(user.name)}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-xs font-semibold text-ink">{user.name}</p>
                  <p className="truncate font-mono text-[10px] text-faint">{user.email}</p>
                </div>
                <Tip label="Sign out">
                  <button
                    onClick={onSignOut}
                    aria-label="Sign out"
                    className="rounded-md p-1.5 text-mut transition-colors hover:bg-bad/10 hover:text-bad"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </Tip>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("dm-sidebar") === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [docs, setDocs] = useState(() => api.getDocumentsSync());
  const [user, setUser] = useState<AuthUser | null>(() => auth.getSessionUser());
  const profileRef = useClickOutside(() => setProfileOpen(false));

  useEffect(() => auth.subscribe(setUser), []);

  const handleSignOut = () => {
    setProfileOpen(false);
    auth.signOut().then(() => toast("Signed out.", "info"));
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const refresh = () => setDocs(api.getDocumentsSync());
    window.addEventListener(DOCS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DOCS_CHANGED_EVENT, refresh);
  }, []);

  const setCollapsedPersist = (v: boolean) => {
    setCollapsed(v);
    try {
      localStorage.setItem("dm-sidebar", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-page">
      {/* desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden lg:block border-r border-line bg-panel transition-[width] duration-300",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        <button
          onClick={() => setCollapsedPersist(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-[70px] z-50 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-panel2 text-mut shadow-lg hover:text-ink transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
        </button>
        <SidebarContent
          collapsed={collapsed}
          docs={docs}
          user={user}
          onSettings={() => setSettingsOpen(true)}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-panel/90 backdrop-blur px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-mut hover:text-ink hover:bg-ink/5"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Logo />
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-mut hover:text-ink hover:bg-ink/5"
          >
            {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-lg p-2 text-mut hover:bg-bad/10 hover:text-bad"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#02060f]/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="anim-rise absolute inset-y-0 left-0 w-72 border-r border-line bg-panel shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-5 rounded-lg p-1.5 text-mut hover:text-ink hover:bg-ink/5"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent
              collapsed={false}
              docs={docs}
              user={user}
              onNavigate={() => setMobileOpen(false)}
              onSettings={() => {
                setMobileOpen(false);
                setSettingsOpen(true);
              }}
              onSignOut={() => {
                setMobileOpen(false);
                handleSignOut();
              }}
            />
          </div>
        </div>
      )}

      {/* main */}
      <main className={cn("transition-[padding] duration-300", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </div>

        {/* footer strip */}
        <footer className="mx-auto w-full max-w-[1440px] px-4 pb-8 sm:px-6 lg:px-10">
          <div className="fade-rule mb-4" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-[11px] font-mono text-faint">
              {branding.name} · {branding.version}
            </p>
            <Badge tone="amber">
              {branding.mode}
            </Badge>
          </div>
        </footer>
      </main>

      {/* floating profile (desktop) */}
      <div ref={profileRef} className="fixed bottom-5 left-5 z-40 hidden xl:block" style={{ left: collapsed ? 92 : 272 }}>
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-full border border-line bg-panel2 pl-1.5 pr-3 py-1.5 shadow-xl hover:border-line2 transition-colors"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-acc2 to-vio text-[11px] font-bold text-white">
            {user ? initialsOf(user.name) : "?"}
          </span>
          <span className="text-left leading-tight">
            <span className="block text-xs font-semibold text-ink">{user?.name ?? "Guest"}</span>
            <span className="block text-[10px] font-mono text-faint">{user?.email ?? "not signed in"}</span>
          </span>
        </button>
        {profileOpen && (
          <div className="anim-rise absolute bottom-12 left-0 w-56 rounded-xl border border-line bg-panel p-2 shadow-2xl">
            <p className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-faint">Session</p>
            <button
              onClick={() => {
                setProfileOpen(false);
                navigate(nav.documents);
                setTimeout(() => window.scrollTo({ top: 0 }), 50);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-mut hover:bg-ink/5 hover:text-ink"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restart demo tour
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem("dm-theme");
                  localStorage.removeItem("dm-sidebar");
                } catch {
                  /* ignore */
                }
                window.location.reload();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-mut hover:bg-ink/5 hover:text-ink"
            >
              <Settings2 className="w-3.5 h-3.5" /> Reset preferences
            </button>
            <div className="fade-rule my-1.5" />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-bad hover:bg-bad/10"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        )}
      </div>

      {/* settings modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-faint">Appearance</p>
            <div className="flex gap-2">
              <Button variant={theme === "dark" ? "secondary" : "outline"} size="sm" onClick={() => theme !== "dark" && toggle()}>
                <Moon className="w-3.5 h-3.5" /> Dark
              </Button>
              <Button variant={theme === "light" ? "secondary" : "outline"} size="sm" onClick={() => theme !== "light" && toggle()}>
                <Sun className="w-3.5 h-3.5" /> Light
              </Button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-faint">Demo mode</p>
            <div className="rounded-lg border border-warn/25 bg-warn/5 p-3.5">
              <p className="text-sm text-ink">{branding.mode}</p>
              <p className="mt-1.5 text-xs text-mut">
                Uploads, retrieval traces and analytics are simulated in the browser. Connect
                <span className="font-mono text-acc"> src/services/api.ts</span> to the backend to go live.
              </p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-faint">Data</p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {
                  /* ignore */
                }
                window.location.reload();
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset demo data
            </Button>
          </div>
          <div className="fade-rule" />
          <p className="text-[11px] font-mono text-faint">
            {branding.name} · {branding.version} · {branding.tagline}
          </p>
        </div>
      </Modal>
    </div>
  );
}
