function findingLabel(key) {
  return key.replace(/_/g, " ");
}

function ScoreCard({ label, score, threshold }) {
  const numericScore = typeof score === "number" ? score : 0;
  const didPass = numericScore >= (threshold ?? 0);
  return (
    <div className="quality-score">
      <div className="quality-score__label">{label}</div>
      <div
        className={`quality-score__value ${
          didPass ? "quality-score__value--good" : "quality-score__value--warn"
        }`}
      >
        {Math.round(numericScore * 100)}%
      </div>
      <div className="quality-score__threshold">
        minimum {Math.round((threshold ?? 0) * 100)}%
      </div>
    </div>
  );
}

function ReviewItems({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="field">
      <div className="field__label">{title}</div>
      <ul className="issue-list">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="issue-list__item">
            {typeof item === "string" ? item : item.claim || JSON.stringify(item)}
            {typeof item === "object" && (item.reason || item.evidence) && (
              <span className="quality-evidence"> — {item.reason || item.evidence}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function QualityPanel({
  report,
  passed,
  runStatus,
  isActive,
  guardAvailable,
}) {
  if (!report) {
    if (!isActive) return null;
    return (
      <section className="sheet">
        <div className="sheet__tab">
          <span className="sheet__tab-index">05</span>
          <span className="eyebrow">Quality</span>
        </div>
        <div className="sheet__body">
          <div className="sheet__header">
            <h2>Reviewing completeness and quality…</h2>
          </div>
          <div className="skeleton-block" style={{ marginTop: 12 }}>
            <div className="skeleton-line" style={{ width: "70%" }} />
            <div className="skeleton-line" style={{ width: "50%" }} />
          </div>
        </div>
      </section>
    );
  }

  const qualityFindings = Object.entries(report.quality_findings || {});
  const grounding = report.grounding_review || {};
  const hasGroundingReview =
    Object.hasOwn(grounding, "groundedness_score") ||
    Object.hasOwn(grounding, "coherence_score") ||
    Boolean(grounding.evaluation_error);

  return (
    <section className={`sheet ${passed ? "" : "sheet--warn"}`}>
      <div className="sheet__tab">
        <span className="sheet__tab-index">05</span>
        <span className="eyebrow">Quality</span>
      </div>
      <div className="sheet__body">
        {guardAvailable === false && (
          <div className="banner banner--alert">
            LLM Guard is unavailable on the backend. Toxicity and refusal scanners are not active.
          </div>
        )}
        <div className="sheet__header sheet__header--row">
          <h2>
            {passed
              ? "Proposal approved"
              : runStatus === "failed"
                ? "Failed — maximum retries reached"
                : "Needs another generation pass"}
          </h2>
          <span className={`pill ${passed ? "pill--good" : "pill--warn"}`}>
            {report.word_count ?? 0} words
          </span>
        </div>

        <div className="field-grid" style={{ marginTop: 14 }}>
          <div className="field">
            <div className="field__label">Required sections</div>
            <div className="field__value">
              {report.missing_sections?.length ? (
                <ul className="chip-list">
                  {report.missing_sections.map((section) => (
                    <li key={section} className="chip chip--warn">
                      missing: {section}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="chip chip--good">all present</span>
              )}
            </div>
          </div>

          <div className="field">
            <div className="field__label">Quality scanners</div>
            <div className="field__value">
              {qualityFindings.length ? (
                <ul className="chip-list">
                  {qualityFindings.map(([label, value]) => (
                    <li key={label} className="chip chip--warn">
                      {findingLabel(label)}: {value}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="chip chip--good">clean</span>
              )}
            </div>
          </div>
        </div>

        {hasGroundingReview && (
          <div className="quality-scores">
            <ScoreCard
              label="Groundedness"
              score={grounding.groundedness_score}
              threshold={report.groundedness_threshold}
            />
            <ScoreCard
              label="Coherence"
              score={grounding.coherence_score}
              threshold={report.coherence_threshold}
            />
          </div>
        )}

        {report.out_of_order_sections?.length > 0 && (
          <div className="field">
            <div className="field__label">Template section order</div>
            <ul className="chip-list">
              {report.out_of_order_sections.map((section) => (
                <li key={section} className="chip chip--warn">
                  out of order: {section}
                </li>
              ))}
            </ul>
          </div>
        )}

        {grounding.evaluation_error && (
          <div className="banner banner--alert">
            Quality evaluator error: {grounding.evaluation_error}
          </div>
        )}

        <ReviewItems title="Unsupported claims" items={grounding.unsupported_claims} />
        <ReviewItems title="Contradictions" items={grounding.contradictions} />
        <ReviewItems title="Coherence issues" items={grounding.coherence_issues} />

        {report.notes?.length > 0 && (
          <div className="field">
            <div className="field__label">Review notes</div>
            <ul className="issue-list">
              {report.notes.map((note, index) => (
                <li key={`${note}-${index}`} className="issue-list__item">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="sheet__footnote">
          Quality failures return to proposal generation, with a maximum of three attempts.
          Security findings are handled separately and always require human review.
        </p>
      </div>
    </section>
  );
}
