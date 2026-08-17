import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../api.js";

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5v8.3m0 0L4.6 6.4M8 9.8l3.4-3.4M2.5 12.5h11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const STATUS_LABELS = {
  waiting: "Waiting",
  generating: "Generating",
  complete: "Completed",
  incomplete: "Needs content",
};

function templateSections(templateRules, progress) {
  if (progress?.sections?.length) return progress.sections;
  const titles = templateRules?.section_order || templateRules?.required_sections || [];
  return titles.map((title) => ({ title, status: "waiting", content: "" }));
}

export default function ProposalPanel({
  draft,
  attempts,
  isLoading,
  runId,
  templateRules,
  templateFilename,
  progress,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [followAI, setFollowAI] = useState(true);
  const documentRef = useRef(null);
  const sectionRefs = useRef([]);
  const wordCount = useMemo(() => countWords(draft || progress?.draft), [draft, progress?.draft]);
  const sections = useMemo(
    () => templateSections(templateRules, progress),
    [templateRules, progress],
  );
  const hasWorkspace = Boolean(draft || isLoading || sections.length);
  const completedCount = sections.filter((section) => section.status === "complete").length;
  const progressPercent = sections.length
    ? Math.round((completedCount / sections.length) * 100)
    : 0;
  const generatingIndex = sections.findIndex((section) => section.status === "generating");

  const moveToSection = (index) => {
    setActiveIndex(index);
    const container = documentRef.current;
    const target = sectionRefs.current[index];
    if (container && target) {
      container.scrollTo({ top: Math.max(0, target.offsetTop - 22), behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (followAI && generatingIndex >= 0) moveToSection(generatingIndex);
  }, [followAI, generatingIndex]);

  if (!hasWorkspace) return null;

  return (
    <section className="sheet sheet--proposal">
      <div className="sheet__tab">
        <span className="sheet__tab-index">03</span>
        <span className="eyebrow">Live generation</span>
      </div>

      <div className="sheet__body">
        <div className="sheet__header sheet__header--row proposal-header">
          <div>
            <h2>Template fill workspace</h2>
            <p className="sheet__lede proposal-header__lede">
              {templateFilename || "Uploaded response template"}
            </p>
          </div>
          <div className="sheet__header-actions">
            {attempts > 1 && <span className="pill">Attempt {attempts}</span>}
            {progress?.batch_count > 0 && (
              <span className="pill">
                Batch {Math.min(progress.batch_number || 1, progress.batch_count)}/
                {progress.batch_count}
              </span>
            )}
            {wordCount > 0 && (
              <span className="pill pill--muted">{wordCount.toLocaleString()} words</span>
            )}
            {draft && (
              <a className="btn btn--download" href={api.downloadUrl(runId)} download>
                <DownloadIcon />
                Download .md
              </a>
            )}
          </div>
        </div>

        <div className="generation-toolbar">
          <div className="generation-toolbar__summary">
            <span className={`generation-orb ${isLoading ? "generation-orb--active" : ""}`}>✦</span>
            <div>
              <strong>
                {isLoading
                  ? `AI is drafting ${
                      generatingIndex >= 0 ? sections[generatingIndex]?.title : "the proposal"
                    }`
                  : completedCount === sections.length && sections.length
                    ? "Proposal draft completed"
                    : "Template ready for generation"}
              </strong>
              <span>
                {completedCount} of {sections.length} sections completed
              </span>
            </div>
          </div>
          <div className="generation-toolbar__meter">
            <div
              className="generation-progress"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progressPercent}
              aria-label="Proposal generation progress"
            >
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <strong>{progressPercent}%</strong>
          </div>
          <button
            type="button"
            className={`follow-toggle ${followAI ? "follow-toggle--active" : ""}`}
            aria-pressed={followAI}
            onClick={() => setFollowAI((value) => !value)}
          >
            <span className="follow-toggle__dot" />
            Follow AI
          </button>
        </div>

        <div className="proposal-workspace">
          <aside className="template-outline scrollbar-thin" aria-label="Template section outline">
            <div className="template-outline__header">
              <span className="eyebrow">Uploaded template</span>
              <strong>{sections.length} required sections</strong>
            </div>
            <ol className="template-outline__list">
              {sections.map((section, index) => (
                <li key={`${section.title}-${index}`}>
                  <button
                    type="button"
                    onClick={() => moveToSection(index)}
                    className={`template-outline__item template-outline__item--${section.status} ${
                      activeIndex === index ? "template-outline__item--active" : ""
                    }`}
                  >
                    <span className="template-outline__index">
                      {section.status === "complete" ? "✓" : index + 1}
                    </span>
                    <span className="template-outline__title">{section.title}</span>
                    <span className="template-outline__status">
                      {STATUS_LABELS[section.status] || section.status}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>

          <div ref={documentRef} className="live-document scrollbar-thin" aria-live="polite">
            {sections.map((section, index) => (
              <article
                ref={(node) => {
                  sectionRefs.current[index] = node;
                }}
                key={`${section.title}-content-${index}`}
                className={`live-section live-section--${section.status} ${
                  activeIndex === index ? "live-section--active" : ""
                }`}
                onClick={() => setActiveIndex(index)}
              >
                <div className="live-section__status">
                  <span className="live-section__dot" />
                  {STATUS_LABELS[section.status] || section.status}
                </div>
                {section.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
                ) : (
                  <>
                    <h2>{section.title}</h2>
                    {section.status === "generating" ? (
                      <div className="live-section__skeleton" aria-label="AI is filling this section">
                        <div className="skeleton-line" style={{ width: "94%" }} />
                        <div className="skeleton-line" style={{ width: "81%" }} />
                        <div className="skeleton-line" style={{ width: "68%" }} />
                      </div>
                    ) : (
                      <p className="live-section__placeholder">
                        This section will be filled from tender and company evidence.
                      </p>
                    )}
                  </>
                )}
              </article>
            ))}

            {!sections.length && isLoading && (
              <div className="live-document__empty">
                Reading the uploaded template and preparing its section outline…
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
