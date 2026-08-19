/**
 * Central branding / product configuration.
 * Rename the product here — nothing else should hardcode the name.
 */
export const branding = {
  name: "DocuMind AI",
  shortName: "DocuMind",
  tagline: "Adaptive Multimodal Document Intelligence",
  description:
    "Understand documents beyond text with adaptive multimodal retrieval and evidence-grounded AI.",
  version: "v0.4 · hackathon build",
  mode: "Frontend demo — mock data until backend integration",
};

export const nav = {
  landing: "/",
  documents: "/documents",
  analytics: "/analytics",
  exams: "/exams",
  assistantFor: (documentId: string) => `/assistant/${documentId}`,
  workspaceFor: (documentId: string) => `/documents/${documentId}`,
};

/** Document shown throughout the guided demo flow. */
export const defaultDocumentId = "ai-research-report";
