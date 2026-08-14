import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import RunList from "./components/RunList.jsx";
import PipelineRail from "./components/PipelineRail.jsx";
import StatusBadge from "./components/StatusBadge.jsx";
import VerificationPanel from "./components/VerificationPanel.jsx";
import DocumentProcessingPanel from "./components/DocumentProcessingPanel.jsx";
import RequirementsPanel from "./components/RequirementsPanel.jsx";
import ResearchPanel from "./components/ResearchPanel.jsx";
import ProposalPanel from "./components/ProposalPanel.jsx";
import SecurityPanel from "./components/SecurityPanel.jsx";
import QualityPanel from "./components/QualityPanel.jsx";
import KnowledgeBase from "./components/KnowledgeBase.jsx";
import UploadDropzone from "./components/UploadDropzone.jsx";

const ACTIVE_STATUSES = new Set(["queued", "running"]);
const DEFAULT_PIPELINE_STAGES = [
  "verifier",
  "processing",
  "extraction",
  "research",
  "generation",
  "security",
  "quality",
];

const STAGE_LABELS = {
  verifier: "verification",
  processing: "document AI processing",
  extraction: "requirements extraction",
  research: "market research",
  generation: "proposal generation",
  security: "security review",
  quality: "quality review",
};

function normalizePipelineStages(stages) {
  const nextStages = Array.isArray(stages) ? stages : DEFAULT_PIPELINE_STAGES;
  const normalized = nextStages
    .map((stage) => {
      if (typeof stage === "string") return stage;
      if (stage && typeof stage === "object") return stage.key || stage.name || stage.label || "stage";
      return null;
    })
    .filter(Boolean);

  // These are real user-visible phases even while document processing remains
  // inside the verifier node on older backend deployments.
  if (!normalized.includes("processing")) {
    const verifierIndex = normalized.indexOf("verifier");
    normalized.splice(verifierIndex >= 0 ? verifierIndex + 1 : 0, 0, "processing");
  }
  if (!normalized.includes("security")) {
    const generationIndex = normalized.indexOf("generation");
    normalized.splice(generationIndex >= 0 ? generationIndex + 1 : normalized.length, 0, "security");
  }
  return normalized;
}

function formatValue(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  return String(value ?? "—");
}

export default function App() {
  const [view, setView] = useState("pipeline"); // "pipeline" | "knowledge"
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [runDetail, setRunDetail] = useState(null);
  const [pipelineStages, setPipelineStages] = useState(DEFAULT_PIPELINE_STAGES);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const pollRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    api
      .health()
      .then(({ stages }) => {
        if (mounted) setPipelineStages(normalizePipelineStages(stages));
      })
      .catch(() => {
        if (mounted) setPipelineStages(DEFAULT_PIPELINE_STAGES);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Poll the run list continuously (cheap) so new/other runs' status stays fresh.
  useEffect(() => {
    const refreshList = () => api.listRuns().then(setRuns).catch(() => {});
    refreshList();
    const id = setInterval(refreshList, 4000);
    return () => clearInterval(id);
  }, []);

  // Poll the selected run's full detail — fast while active, stop once terminal.
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedRunId) {
      setRunDetail(null);
      return;
    }

    const fetchDetail = () => {
      api
        .getRun(selectedRunId)
        .then((detail) => {
          setRunDetail(detail);
          if (!ACTIVE_STATUSES.has(detail.run_status) && pollRef.current) {
            clearInterval(pollRef.current);
          }
        })
        .catch(() => {});
    };

    fetchDetail();
    pollRef.current = setInterval(fetchDetail, 1500);
    return () => clearInterval(pollRef.current);
  }, [selectedRunId]);

  const handleUploadFile = async (file) => {
    setUploading(true);
    setUploadError(null);
    try {
      const { run_id } = await api.startRun(file);
      setShowUploadModal(false);
      setSelectedRunId(run_id);
      setView("pipeline");
      api.listRuns().then(setRuns).catch(() => {});
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const state = runDetail?.state || {};
  const isRunActive = ACTIVE_STATUSES.has(runDetail?.run_status);
  const currentStage = runDetail?.current_stage;
  const currentStageLabel = STAGE_LABELS[currentStage] || currentStage || "starting";
  const stageNames = normalizePipelineStages(pipelineStages);
  const hasVerifierStage = stageNames.includes("verifier") || Object.hasOwn(state, "verification_errors");
  const processingReport =
    state.document_processing || state.extraction_result || state.extractor_result || null;
  const processingIndexResult = state.index_result || processingReport?.index_result || null;
  const hasProcessingStage =
    stageNames.includes("processing") || Boolean(processingReport || processingIndexResult);
  const hasExtractionStage = stageNames.includes("extraction") || Object.hasOwn(state, "requirements");
  const hasResearchStage = stageNames.includes("research") || Object.hasOwn(state, "research_summary");
  const hasGenerationStage = stageNames.includes("generation") || Object.hasOwn(state, "draft_proposal");
  const hasSecurityStage =
    stageNames.includes("security") || Object.hasOwn(state, "security_report");
  const hasQualityStage = stageNames.includes("quality") || Object.hasOwn(state, "quality_report");
  const genericEntries = Object.entries(state).filter(([key, value]) => {
    if (["tender_file_path", "status", "generation_attempts", "errors", "verification_errors", "workspace_slug", "document_processing", "extraction_result", "extractor_result", "index_result", "requirements", "research_summary", "draft_proposal", "security_passed", "security_report", "quality_passed", "quality_report"].includes(key)) {
      return false;
    }
    return value !== undefined && value !== null && value !== "";
  });

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="top-bar__brand">
          <span className="top-bar__mark">§</span>
          Tender Desk
        </div>
        <nav className="top-bar__nav">
          <button
            className={`top-bar__tab ${view === "pipeline" ? "top-bar__tab--active" : ""}`}
            onClick={() => setView("pipeline")}
          >
            Pipeline
          </button>
          <button
            className={`top-bar__tab ${view === "knowledge" ? "top-bar__tab--active" : ""}`}
            onClick={() => setView("knowledge")}
          >
            Knowledge base
          </button>
        </nav>
      </div>

      <div className="app-body">
        {view === "pipeline" ? (
          <>
            <RunList
              runs={runs}
              selectedRunId={selectedRunId}
              onSelect={setSelectedRunId}
              onNewRun={() => setShowUploadModal(true)}
              uploading={uploading}
            />

            <div className="workspace">
              {selectedRunId ? (
                <>
                  <PipelineRail record={runDetail} stages={stageNames} />
                  <div className="sheets scrollbar-thin">
                    <div className="sheets__header">
                      <div>
                        <div className="eyebrow">{runDetail?.tender_filename}</div>
                        <h1 className="sheets__title">
                          {isRunActive
                            ? `Running — ${currentStageLabel}…`
                            : "Run summary"}
                        </h1>
                      </div>
                      <StatusBadge status={runDetail?.run_status} />
                    </div>

                    {runDetail?.error && (
                      <div className="banner banner--alert" style={{ width: "100%", maxWidth: "var(--doc-width)", marginBottom: 18 }}>
                        {runDetail.error}
                      </div>
                    )}

                    {runDetail?.run_status === "blocked" && hasVerifierStage && (
                      <VerificationPanel errors={state.verification_errors} />
                    )}

                    {runDetail?.run_status !== "blocked" && (
                      <>
                        {hasProcessingStage && (
                          <DocumentProcessingPanel
                            report={processingReport}
                            indexResult={processingIndexResult}
                            workspaceSlug={state.workspace_slug}
                            isLoading={
                              isRunActive &&
                              (currentStage === "processing" || currentStage === "verifier")
                            }
                          />
                        )}
                        {hasExtractionStage && (
                          <RequirementsPanel
                            requirements={state.requirements}
                            isLoading={isRunActive && currentStage === "extraction"}
                          />
                        )}
                        {hasResearchStage && (
                          <ResearchPanel
                            researchSummary={state.research_summary}
                            isLoading={isRunActive && currentStage === "research"}
                            isActive={currentStage === "research" && isRunActive}
                          />
                        )}
                        {hasGenerationStage && (
                          <ProposalPanel
                            draft={state.draft_proposal}
                            attempts={state.generation_attempts}
                            runId={selectedRunId}
                            isLoading={isRunActive && currentStage === "generation"}
                          />
                        )}
                        {hasSecurityStage && (
                          <SecurityPanel
                            report={state.security_report}
                            passed={state.security_passed}
                            isActive={isRunActive && currentStage === "security"}
                          />
                        )}
                        {hasQualityStage && (
                          <QualityPanel
                            report={state.quality_report}
                            passed={state.quality_passed}
                            runStatus={runDetail?.run_status}
                            isActive={isRunActive && currentStage === "quality"}
                          />
                        )}
                      </>
                    )}

                    {!hasVerifierStage && !hasProcessingStage && !hasExtractionStage && !hasResearchStage && !hasGenerationStage && !hasSecurityStage && !hasQualityStage && genericEntries.length > 0 && (
                      <section className="sheet">
                        <div className="sheet__tab">
                          <span className="sheet__tab-index">∞</span>
                          <span className="eyebrow">Pipeline output</span>
                        </div>
                        <div className="sheet__body">
                          <div className="sheet__header">
                            <h2>Run data</h2>
                          </div>
                          <div className="field-grid" style={{ marginTop: 14 }}>
                            {genericEntries.map(([key, value]) => (
                              <div key={key} className="field">
                                <div className="field__label">{key}</div>
                                <div className="field__value" style={{ whiteSpace: "pre-wrap" }}>
                                  {formatValue(value)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    )}
                  </div>
                </>
              ) : (
                <EmptyState onNewRun={() => setShowUploadModal(true)} />
              )}
            </div>
          </>
        ) : (
          <KnowledgeBase />
        )}
      </div>

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Start a new tender run</h2>
              <button
                className="modal__close"
                onClick={() => setShowUploadModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <UploadDropzone
              onFile={handleUploadFile}
              disabled={uploading}
              label={uploading ? "Uploading for document AI processing…" : "Drop the tender PDF or DOCX here"}
              sublabel="Bilingual OCR, table extraction, layout metadata and Qdrant indexing"
            />
            {uploadError && <div className="banner banner--alert">{uploadError}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onNewRun }) {
  return (
    <div className="empty-state">
      <div className="empty-state__mark">§</div>
      <h2>No tender selected</h2>
      <p>Pick a run from the list, or start a new one to send a tender through the pipeline.</p>
      <button className="btn btn--primary" onClick={onNewRun}>
        + New tender run
      </button>
    </div>
  );
}
