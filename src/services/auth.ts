/// <reference types="vite/client" />

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

type BackendUser = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: BackendUser;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const TOKEN_KEY = "dm-auth-token";
const USER_KEY = "dm-auth-user";

const listeners = new Set<(u: AuthUser | null) => void>();

const toUser = (user: BackendUser): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.created_at,
});

const readUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

const notify = () => {
  const user = readUser();
  listeners.forEach((listener) => listener(user));
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
};

const persistSession = (authResponse: AuthResponse): AuthUser => {
  const user = toUser(authResponse.user);
  localStorage.setItem(TOKEN_KEY, authResponse.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notify();
  return user;
};

export const auth = {
  getSessionUser(): AuthUser | null {
    return readUser();
  },

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  subscribe(cb: (u: AuthUser | null) => void): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },

  async signIn(email: string, password: string): Promise<AuthUser> {
    const response = await requestJson<AuthResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return persistSession(response);
  },

  async signUp(name: string, email: string, password: string): Promise<AuthUser> {
    const response = await requestJson<AuthResponse>("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return persistSession(response);
  },

  async refreshSession(): Promise<AuthUser | null> {
    const token = auth.getAccessToken();
    if (!token) return null;
    try {
      const user = await requestJson<BackendUser>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const mapped = toUser(user);
      localStorage.setItem(USER_KEY, JSON.stringify(mapped));
      notify();
      return mapped;
    } catch {
      await auth.signOut();
      return null;
    }
  },

  async signOut(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
