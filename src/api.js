// Backend base URL — comes from a Vite env var so it's swappable per
// environment (local dev vs. the deployed HF Space) without code changes.
// Falls back to "/api" for local dev if you're still proxying through
// Vite's dev server (see vite.config.js note below).
const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore parse failure, fall back to statusText */
    }
    throw new Error(detail);
  }
  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : res.text();
}

export const api = {
  health: () => fetch(`${BASE}/health`).then(handle),

  startRun: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${BASE}/runs`, { method: "POST", body: formData }).then(handle);
  },

  listRuns: () => fetch(`${BASE}/runs`).then(handle),

  getRun: (runId) => fetch(`${BASE}/runs/${runId}`).then(handle),

  downloadUrl: (runId) => `${BASE}/runs/${runId}/download`,

  knowledgeStatus: () => fetch(`${BASE}/knowledge`).then(handle),

  uploadKnowledgeFile: (category, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${BASE}/knowledge/${category}/upload`, {
      method: "POST",
      body: formData,
    }).then(handle);
  },
};