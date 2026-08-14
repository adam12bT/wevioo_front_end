function findingLabel(key) {
  return key.replace(/_/g, " ");
}

export default function QualityPanel({ report, passed, runStatus, isActive }) {
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

  return (
    <section className={`sheet ${passed ? "" : "sheet--warn"}`}>
      <div className="sheet__tab">
        <span className="sheet__tab-index">05</span>
        <span className="eyebrow">Quality</span>
      </div>
      <div className="sheet__body">
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
