import { api } from "../api.js";

function percent(value) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "Not available";
}

function seconds(value) {
  if (typeof value !== "number") return "Not available";
  if (value < 60) return `${value.toFixed(1)} s`;
  return `${Math.floor(value / 60)}m ${Math.round(value % 60)}s`;
}

function Metric({ label, value, tone = "neutral" }) {
  return (
    <div className={`worker-metric worker-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function WorkerEvaluationPanel({
  evaluation,
  isActive,
  jobId,
  documentVersion,
  versions,
}) {
  const rag = evaluation?.rag;
  const output = evaluation?.output;
  const performance = evaluation?.performance;
  const usage = performance?.llm_token_usage || {};
  const hasEvaluation = Boolean(evaluation && Object.keys(evaluation).length);

  if (!hasEvaluation && !isActive && !documentVersion) return null;

  return (
    <section className="sheet sheet--worker-evaluation">
      <div className="sheet__tab">
        <span className="sheet__tab-index">06</span>
        <span className="eyebrow">Worker evaluation</span>
      </div>
      <div className="sheet__body">
        <div className="sheet__header sheet__header--row">
          <div>
            <h2>{isActive ? "Evaluating the generated proposal…" : "Evaluation report"}</h2>
            <p className="sheet__lede">
              RAG retrieval, output quality and end-to-end performance measured by the worker.
            </p>
          </div>
          {documentVersion && <span className="pill pill--good">Version {documentVersion}</span>}
        </div>

        {isActive && !hasEvaluation && (
          <div className="skeleton-block" style={{ marginTop: 14 }}>
            <div className="skeleton-line" style={{ width: "84%" }} />
            <div className="skeleton-line" style={{ width: "66%" }} />
          </div>
        )}

        {hasEvaluation && (
          <>
            <div className="worker-metrics">
              <Metric
                label="RAG precision@5"
                value={rag?.available ? percent(rag.precision_at_k) : "Dataset required"}
                tone={rag?.available ? "good" : "muted"}
              />
              <Metric
                label="RAG recall@5"
                value={rag?.available ? percent(rag.recall_at_k) : "Dataset required"}
                tone={rag?.available ? "good" : "muted"}
              />
              <Metric
                label="Template compliance"
                value={percent(output?.template_compliance_score)}
                tone={output?.quality_passed ? "good" : "warn"}
              />
              <Metric
                label="Groundedness"
                value={percent(output?.groundedness_score)}
                tone={(output?.groundedness_score || 0) >= 0.75 ? "good" : "warn"}
              />
              <Metric
                label="Pipeline duration"
                value={seconds(performance?.total_duration_seconds)}
              />
              <Metric
                label="Tracked LLM tokens"
                value={
                  typeof usage.total_tokens === "number"
                    ? usage.total_tokens.toLocaleString()
                    : "Not reported"
                }
              />
            </div>

            {!rag?.available && rag?.reason && (
              <div className="banner worker-evaluation__note">{rag.reason}</div>
            )}

            {output?.unsupported_claim_count > 0 && (
              <div className="field">
                <div className="field__label">Unsupported claims</div>
                <div className="field__value">
                  {output.unsupported_claim_count} detected · {output.hallucinations_per_1000_words?.toFixed(2) || 0} per 1,000 words
                </div>
              </div>
            )}

            {performance?.exact_telemetry_available && (
              <div className="banner worker-evaluation__note">
                Exact agent timings and provider-reported token usage are available for this run.
              </div>
            )}
          </>
        )}

        {versions?.length > 0 && (
          <div className="worker-versions">
            <div className="field__label">Saved proposal versions</div>
            <div className="worker-versions__links">
              {versions.map((version) => (
                <a
                  key={version.version}
                  className="btn btn--download"
                  href={api.versionDownloadUrl(jobId, version.version)}
                  download
                >
                  Download V{version.version}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
