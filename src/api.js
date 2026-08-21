// Runs go through the durable worker. Knowledge-base management remains on the
// agent API because it owns those endpoints.
const configuredWorker = (
  import.meta.env.VITE_WORKER_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "/api"
).trim();
const configuredAgent = (
  import.meta.env.VITE_AGENT_API_BASE_URL ||
  import.meta.env.VITE_AGENT_API_URL ||
  "/api"
).trim();

function apiBase(value) {
  const base = value.replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

const WORKER_API = apiBase(configuredWorker);
const WORKER_ROOT = WORKER_API.slice(0, -4);
const AGENT_API = apiBase(configuredAgent);

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || body.message || JSON.stringify(body);
    } catch {
      /* ignore parse failure, fall back to statusText */
    }
    throw new Error(detail);
  }
  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : res.text();
}

function normalizeJobSummary(job) {
  return {
    ...job,
    run_id: job.job_id,
    run_status: job.status,
    response_template_filename: job.template_filename,
  };
}

function normalizeJobDetail(job) {
  const state = job.upstream_state || {};
  return {
    ...job,
    run_id: job.job_id,
    run_status: job.status,
    response_template_filename: job.template_filename,
    state,
    generation_progress: state.generation_progress || job.progress?.generation || null,
  };
}

export const api = {
  health: () => fetch(`${WORKER_ROOT}/health`).then(handle),

  startRun: (file, template, evaluationDataset = null) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("template", template);
    if (evaluationDataset) formData.append("evaluation_dataset", evaluationDataset);
    return fetch(`${WORKER_API}/jobs`, { method: "POST", body: formData }).then(handle);
  },

  listRuns: () =>
    fetch(`${WORKER_API}/jobs`)
      .then(handle)
      .then((jobs) => jobs.map(normalizeJobSummary)),

  getRun: (jobId) =>
    fetch(`${WORKER_API}/jobs/${jobId}`)
      .then(handle)
      .then(normalizeJobDetail),

  cancelRun: (jobId) =>
    fetch(`${WORKER_API}/jobs/${jobId}/cancel`, { method: "POST" }).then(handle),

  rerunRun: (jobId) =>
    fetch(`${WORKER_API}/jobs/${jobId}/rerun`, { method: "POST" }).then(handle),

  getEvaluation: (jobId) => fetch(`${WORKER_API}/jobs/${jobId}/evaluation`).then(handle),

  listVersions: (jobId) => fetch(`${WORKER_API}/jobs/${jobId}/versions`).then(handle),

  downloadUrl: (jobId) => `${WORKER_API}/jobs/${jobId}/download`,

  versionDownloadUrl: (jobId, version) =>
    `${WORKER_API}/jobs/${jobId}/versions/${version}/download`,

  subscribeToRun: (jobId, onEvent, onError) => {
    const source = new EventSource(`${WORKER_API}/jobs/${jobId}/events`);
    const eventNames = [
      "queued",
      "submitting",
      "pipeline",
      "progress",
      "stage",
      "evaluation",
      "complete",
      "failed",
    ];
    const receive = (event) => {
      let data = {};
      try {
        data = JSON.parse(event.data || "{}");
      } catch {
        data = { message: event.data };
      }
      onEvent?.({ type: event.type, data, lastEventId: event.lastEventId });
      if (event.type === "complete" || event.type === "failed") source.close();
    };
    source.onmessage = receive;
    eventNames.forEach((name) => source.addEventListener(name, receive));
    source.onerror = (event) => onError?.(event);
    return () => source.close();
  },

  knowledgeStatus: () => fetch(`${AGENT_API}/knowledge`).then(handle),

  uploadKnowledgeFile: (category, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${AGENT_API}/knowledge/${category}/upload`, {
      method: "POST",
      body: formData,
    }).then(handle);
  },
};
