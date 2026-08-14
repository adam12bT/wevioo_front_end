const DEFAULT_STAGES = [
  { key: "verifier", label: "Verify", hint: "File and format checks" },
  { key: "processing", label: "Document AI", hint: "Bilingual OCR, tables, metadata and Qdrant indexing" },
  { key: "extraction", label: "Extract", hint: "Tender requirements from grounded retrieval", meta: "parallel" },
  { key: "research", label: "Research", hint: "Market and competitor research", meta: "parallel" },
  { key: "generation", label: "Generate", hint: "Grounded technical proposal" },
  { key: "security", label: "Security", hint: "PII, secrets and malicious content gate" },
  { key: "quality", label: "Quality", hint: "Completeness and quality gate" },
];

const STAGE_DETAILS = Object.fromEntries(DEFAULT_STAGES.map((stage) => [stage.key, stage]));

function normalizeStageList(stages) {
  const source = Array.isArray(stages) && stages.length > 0 ? stages : DEFAULT_STAGES;
  return source.map((stage) => {
    if (typeof stage === "string") {
      if (STAGE_DETAILS[stage]) return STAGE_DETAILS[stage];
      const label = stage
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return { key: stage, label, hint: `Pipeline stage: ${label}` };
    }

    if (stage && typeof stage === "object") {
      return {
        key: stage.key || stage.name || stage.label || "stage",
        label: stage.label || stage.name || String(stage.key || stage.name || "Stage"),
        hint: stage.hint || stage.description || `Pipeline stage: ${stage.label || stage.name || stage.key}`,
        meta: stage.meta,
      };
    }

    return { key: String(stage), label: String(stage), hint: "Pipeline stage" };
  });
}

function stageStatus(stageKey, record) {
  if (!record) return "pending";

  const { current_stage, completed_stages = [], run_status, state = {} } = record;
  const isCurrent = current_stage === stageKey;
  const hasRun = completed_stages.includes(stageKey);

  if (stageKey === "verifier" && run_status === "blocked") return "blocked";
  if (stageKey === "processing") {
    if (isCurrent || (current_stage === "verifier" && run_status === "running")) return "active";
    if (hasRun || (completed_stages.includes("verifier") && state.workspace_slug)) return "done";
    return "pending";
  }
  if (stageKey === "security" && run_status === "security_blocked") return "blocked";
  if (isCurrent && (run_status === "running" || run_status === "queued")) return "active";
  if (stageKey === "quality" && run_status === "failed" && hasRun) return "blocked";
  if (hasRun) return "done";
  return "pending";
}

export default function PipelineRail({ record, stages }) {
  const stageList = normalizeStageList(stages);

  return (
    <nav className="docket" aria-label="Pipeline progress">
      <div className="docket__eyebrow eyebrow">Docket · pipeline</div>
      <ol className="docket__list">
        {stageList.map((stage, i) => {
          const status = stageStatus(stage.key, record);
          const isLast = i === stageList.length - 1;
          return (
            <li key={stage.key} className="docket__item">
              <div className="docket__stage">
                <div className={`docket__node docket__node--${status}`} title={stage.hint}>
                  {status === "done" ? "✓" : status === "blocked" ? "!" : i + 1}
                </div>
                <div className={`docket__label docket__label--${status}`}>{stage.label}</div>
                {stage.meta && <div className="docket__meta">{stage.meta}</div>}
              </div>
              {!isLast && (
                <div className={`docket__line ${status === "done" ? "docket__line--done" : ""}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { DEFAULT_STAGES as STAGES };
