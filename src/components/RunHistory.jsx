import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import StatusBadge from "./StatusBadge.jsx";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "blocked", label: "Blocked" },
  { value: "security_blocked", label: "Security blocked" },
  { value: "failed", label: "Failed" },
  { value: "done", label: "Done" },
];

function formatDate(unixSeconds) {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(unixSeconds) {
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function RunHistory({ onSelectRun }) {
  const [runs, setRuns] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    api
      .listRuns()
      .then((data) => {
        setRuns(data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return runs.filter((r) => {
      const matchesQuery = !q || (r.tender_filename || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || r.run_status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [runs, query, statusFilter]);

  return (
    <div className="kb-page scrollbar-thin">
      <div className="kb-page__intro">
        <div className="eyebrow">Run history</div>
        <h1>Every tender that's gone through the pipeline</h1>
        <p>
          Note: run history is kept in the backend's memory for as long as the server process
          stays up. If the server restarts (e.g. a sleeping Space waking back up), older runs
          disappear from this list even though nothing here is "deleted" on purpose.
        </p>
      </div>

      {error && <div className="banner banner--alert">{error}</div>}

      <div className="history-toolbar" style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by filename…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="history-search"
          style={{
            flex: "1 1 240px",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #ccc)",
            font: "inherit",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="history-status-select"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #ccc)",
            font: "inherit",
          }}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="skeleton-block">
          <div className="skeleton-line" style={{ width: "90%" }} />
          <div className="skeleton-line" style={{ width: "75%" }} />
          <div className="skeleton-line" style={{ width: "82%" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="run-list__empty">
          {runs.length === 0 ? "No runs yet." : "No runs match your search/filter."}
        </div>
      ) : (
        <div className="history-table-wrap">
          <table className="history-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Tender</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Status</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Stage</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Completed stages</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Started</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((run) => (
                <tr
                  key={run.run_id}
                  className="history-row"
                  onClick={() => onSelectRun(run.run_id)}
                  style={{ cursor: "pointer" }}
                  title="Open this run"
                >
                  <td style={{ padding: "8px 10px", maxWidth: 260 }}>
                    <span title={run.tender_filename} className="history-row__filename">
                      {run.tender_filename}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <StatusBadge status={run.run_status} small />
                  </td>
                  <td style={{ padding: "8px 10px" }}>{run.current_stage || "—"}</td>
                  <td style={{ padding: "8px 10px" }}>
                    {run.completed_stages?.length ? run.completed_stages.join(" → ") : "—"}
                  </td>
                  <td style={{ padding: "8px 10px" }} title={formatDate(run.created_at)}>
                    {timeAgo(run.created_at)}
                  </td>
                  <td style={{ padding: "8px 10px" }} title={formatDate(run.updated_at)}>
                    {timeAgo(run.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
