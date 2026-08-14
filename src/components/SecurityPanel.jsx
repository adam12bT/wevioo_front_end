const FINDING_LABELS = {
  pii: "PII / sensitive content",
  sensitive: "PII / sensitive content",
  malicious_urls: "Malicious or suspicious URLs",
  prompt_injection: "Prompt injection",
  secrets: "Secret or credential",
  email: "Email address pattern",
  phone: "Phone number pattern",
};

function labelFor(key) {
  return FINDING_LABELS[key] || key.replace(/_/g, " ");
}

function formatValue(value) {
  return typeof value === "number" && !Number.isInteger(value)
    ? `risk ${value}`
    : `${value} found`;
}

export default function SecurityPanel({ report, passed, isActive }) {
  if (!report) {
    if (!isActive) return null;
    return (
      <section className="sheet">
        <div className="sheet__tab">
          <span className="sheet__tab-index">04</span>
          <span className="eyebrow">Security</span>
        </div>
        <div className="sheet__body">
          <div className="sheet__header">
            <h2>Scanning the draft…</h2>
          </div>
          <p className="sheet__lede">
            Checking for PII, secrets, malicious links, prompt injection, and unsafe content.
          </p>
          <div className="skeleton-block">
            <div className="skeleton-line" style={{ width: "70%" }} />
            <div className="skeleton-line" style={{ width: "50%" }} />
          </div>
        </div>
      </section>
    );
  }

  const entries = Object.entries(report.findings || {});
  const blocked = passed === false || entries.length > 0;

  return (
    <section className={`sheet ${blocked ? "sheet--alert" : ""}`}>
      <div className="sheet__tab">
        <span className="sheet__tab-index">04</span>
        <span className="eyebrow">Security</span>
      </div>
      <div className="sheet__body">
        <div className="sheet__header sheet__header--row">
          <h2>{blocked ? "Blocked on security scan" : "Security scan passed"}</h2>
          <span className={`pill ${blocked ? "pill--warn" : "pill--good"}`}>
            {blocked ? "human review" : "safe"}
          </span>
        </div>
        <p className="sheet__lede">
          {blocked
            ? "The draft was stopped before quality review because sensitive or unsafe content was detected."
            : "No PII, secrets, malicious links, prompt injection, or unsafe generated content were detected."}
        </p>

        {blocked && (
          <div className="field">
            <div className="field__label">Findings</div>
            <div className="field__value">
              {entries.length > 0 ? (
                <ul className="chip-list">
                  {entries.map(([key, value]) => (
                    <li key={key} className="chip chip--warn">
                      {labelFor(key)}: {formatValue(value)}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="dash">No structured findings were returned.</span>
              )}
            </div>
          </div>
        )}

        {report.notes?.length > 0 && (
          <div className="field">
            <div className="field__label">Notes</div>
            <ul className="issue-list">
              {report.notes.map((note, index) => (
                <li key={`${note}-${index}`} className="issue-list__item">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
