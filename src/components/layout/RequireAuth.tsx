import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../../services/auth";

/** Route guard: redirects unauthenticated visitors to /login. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(() => auth.getSessionUser());

  useEffect(() => auth.subscribe(setUser), []);

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
