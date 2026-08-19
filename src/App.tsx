import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import LandingPage from "./pages/LandingPage";
import DocumentsPage from "./pages/DocumentsPage";
import DocumentWorkspacePage from "./pages/DocumentWorkspacePage";
import AssistantPage from "./pages/AssistantPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import { Toaster } from "./components/ui";
import { defaultDocumentId, nav } from "./config/branding";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AppShell />}>
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:documentId" element={<DocumentWorkspacePage />} />
          <Route path="/assistant/:documentId" element={<AssistantPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
        <Route path="/assistant" element={<Navigate to={nav.assistantFor(defaultDocumentId)} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </HashRouter>
  );
}
