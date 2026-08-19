import type { } from "../types";

/**
 * Mock authentication service — accounts and sessions persist in localStorage.
 * Swap the internals for real HTTP calls (POST /auth/login etc.) later;
 * the public API stays the same.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface StoredAccount extends AuthUser {
  password: string;
}

interface AuthState {
  accounts: StoredAccount[];
  sessionUserId: string | null;
}

const LS_KEY = "dm-auth";
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function load(): AuthState {
  const demo: StoredAccount = {
    id: "u-demo",
    name: "Demo Judge",
    email: "demo@documind.ai",
    password: "demo1234",
    createdAt: new Date("2025-11-20T10:00:00Z").toISOString(),
  };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthState;
      if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { accounts: [demo], sessionUserId: null };
}

let state: AuthState = load();
const listeners = new Set<(u: AuthUser | null) => void>();

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function toUser(a: StoredAccount): AuthUser {
  const { password: _pw, ...user } = a;
  void _pw;
  return user;
}

function currentUser(): AuthUser | null {
  const acc = state.accounts.find((a) => a.id === state.sessionUserId);
  return acc ? toUser(acc) : null;
}

function notify() {
  const u = currentUser();
  listeners.forEach((l) => l(u));
}

export const auth = {
  getSessionUser(): AuthUser | null {
    return currentUser();
  },

  subscribe(cb: (u: AuthUser | null) => void): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },

  async signIn(email: string, password: string): Promise<AuthUser> {
    await delay(650);
    const acc = state.accounts.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!acc || acc.password !== password) {
      throw new Error("Invalid email or password.");
    }
    state.sessionUserId = acc.id;
    persist();
    notify();
    return toUser(acc);
  },

  async signUp(name: string, email: string, password: string): Promise<AuthUser> {
    await delay(800);
    const exists = state.accounts.some(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (exists) {
      throw new Error("An account with this email already exists.");
    }
    const acc: StoredAccount = {
      id: `u-${Date.now().toString(36)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      createdAt: new Date().toISOString(),
    };
    state.accounts.push(acc);
    state.sessionUserId = acc.id;
    persist();
    notify();
    return toUser(acc);
  },

  async signOut(): Promise<void> {
    await delay(250);
    state.sessionUserId = null;
    persist();
    notify();
  },
};

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}
