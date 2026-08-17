import { useMemo } from "react";
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
  const wordCount = useMemo(() => countWords(draft || progress?.draft), [draft, progress?.draft]);
  const sections = useMemo(
    () => templateSections(templateRules, progress),
    [templateRules, progress],
  );
  const hasWorkspace = Boolean(draft || isLoading || sections.length);

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

        <div className="proposal-workspace">
          <aside className="template-outline scrollbar-thin" aria-label="Template section outline">
            <div className="template-outline__header">
              <span className="eyebrow">Uploaded template</span>
              <strong>{sections.length} required sections</strong>
            </div>
            <ol className="template-outline__list">
              {sections.map((section, index) => (
                <li
                  key={`${section.title}-${index}`}
                  className={`template-outline__item template-outline__item--${section.status}`}
                >
                  <span className="template-outline__index">
                    {section.status === "complete" ? "✓" : index + 1}
                  </span>
                  <span className="template-outline__title">{section.title}</span>
                  <span className="template-outline__status">
                    {STATUS_LABELS[section.status] || section.status}
                  </span>
                </li>
              ))}
            </ol>
          </aside>

          <div className="live-document scrollbar-thin" aria-live="polite">
            {sections.map((section, index) => (
              <article
                key={`${section.title}-content-${index}`}
                className={`live-section live-section--${section.status}`}
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
