function Metric({ label, value, detail }) {
  return (
    <div className="processing-metric">
      <div className="processing-metric__label">{label}</div>
      <div className="processing-metric__value">{value ?? "—"}</div>
      {detail && <div className="processing-metric__detail">{detail}</div>}
    </div>
  );
}

function normalizeProcessingResult(report, indexResult) {
  const response = report || {};
  const document = response.document || response;
  return {
    document,
    metadata: document.metadata || {},
    pages: Array.isArray(document.pages) ? document.pages : [],
    blocks: Array.isArray(document.blocks) ? document.blocks : [],
    warnings: Array.isArray(document.warnings) ? document.warnings : [],
    index: indexResult || response.index_result || null,
    success: response.success,
    error: response.error,
  };
}

export default function DocumentProcessingPanel({
  report,
  indexResult,
  workspaceSlug,
  isLoading,
  documentLabel = "Tender",
  tabIndex = "00",
}) {
  const result = normalizeProcessingResult(report, indexResult);
  const { metadata, pages, blocks, warnings, index } = result;
  const hasDetailedReport = Boolean(
    report && (Object.keys(metadata).length || pages.length || blocks.length || index),
  );

  if (isLoading) {
    return (
      <section className="sheet">
        <div className="sheet__tab">
          <span className="sheet__tab-index">{tabIndex}</span>
          <span className="eyebrow">Document AI</span>
        </div>
        <div className="sheet__body">
          <div className="sheet__header">
            <h2>Extracting and indexing the {documentLabel.toLowerCase()}…</h2>
          </div>
          <p className="sheet__lede">
            Detecting native and scanned pages, running English/French OCR, recovering tables,
            preserving layout metadata, then indexing the result in AnythingLLM.
          </p>
          <div className="processing-flow" aria-label="Document processing progress">
            <span className="processing-flow__step processing-flow__step--active">Extract</span>
            <span className="processing-flow__arrow">→</span>
            <span className="processing-flow__step">Structure</span>
            <span className="processing-flow__arrow">→</span>
            <span className="processing-flow__step">Chunk 512 / 50</span>
            <span className="processing-flow__arrow">→</span>
            <span className="processing-flow__step">Qdrant</span>
          </div>
        </div>
      </section>
    );
  }

  if (!hasDetailedReport && !workspaceSlug) return null;

  const ocrPages = metadata.ocr_pages ?? pages.filter((page) => page.used_ocr).length;
  const nativePages =
    metadata.native_pages ?? pages.filter((page) => !page.used_ocr).length;
  const tableCount =
    metadata.table_count ?? blocks.filter((block) => block.type === "table").length;
  const blockCount = blocks.length || index?.blocks_sent;
  const indexed = index?.success ?? result.success;
  const failed = indexed === false || Boolean(result.error || index?.error);

  return (
    <section className={`sheet ${failed ? "sheet--alert" : ""}`}>
      <div className="sheet__tab">
        <span className="sheet__tab-index">{tabIndex}</span>
        <span className="eyebrow">Document AI</span>
      </div>
      <div className="sheet__body">
        <div className="sheet__header sheet__header--row">
          <div>
            <h2>
              {failed
                ? "Document indexing failed"
                : hasDetailedReport
                  ? `${documentLabel} processed and indexed`
                  : "AnythingLLM workspace ready"}
            </h2>
            <p className="sheet__lede">
              Workspace <code>{index?.workspace_slug || workspaceSlug}</code>
            </p>
          </div>
          <span className={`pill ${failed ? "pill--warn" : "pill--good"}`}>
            {failed ? "action required" : indexed === false ? "not indexed" : "ready for RAG"}
          </span>
        </div>

        {hasDetailedReport ? (
          <>
            <div className="processing-metrics">
              <Metric label="Pages" value={metadata.page_count ?? pages.length} />
              <Metric label="Native" value={nativePages} detail="selectable text" />
              <Metric label="OCR" value={ocrPages} detail="English + French" />
              <Metric label="Tables" value={tableCount} detail="native + scanned" />
              <Metric label="Blocks" value={blockCount} detail="layout ordered" />
              <Metric
                label="Indexed"
                value={index?.blocks_sent ?? "—"}
                detail={index?.skipped_existing ? `${index.skipped_existing} already existed` : "Qdrant"}
              />
            </div>

            <div className="processing-flow" aria-label="Completed document processing path">
              <span className="processing-flow__step processing-flow__step--done">Native + OCR</span>
              <span className="processing-flow__arrow">→</span>
              <span className="processing-flow__step processing-flow__step--done">Tables + layout</span>
              <span className="processing-flow__arrow">→</span>
              <span className="processing-flow__step processing-flow__step--done">Chunk 512 / 50</span>
              <span className="processing-flow__arrow">→</span>
              <span className="processing-flow__step processing-flow__step--done">AnythingLLM + Qdrant</span>
            </div>

            <div className="field">
              <div className="field__label">Metadata preserved</div>
              <ul className="chip-list">
                {[
                  "source filename",
                  "document type",
                  "page",
                  "section",
                  "content type",
                  "extraction method",
                  "layout order",
                  "bounding box",
                  "external ID",
                ].map((item) => (
                  <li key={item} className="chip chip--good">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="sheet__lede">
            This older run confirms that a searchable workspace was created, but it does not
            include the extractor’s detailed OCR, table, and indexing report.
          </p>
        )}

        {(result.error || index?.error) && (
          <div className="banner banner--alert">{index?.error || result.error?.message || String(result.error)}</div>
        )}

        {warnings.length > 0 && (
          <div className="field">
            <div className="field__label">Warnings</div>
            <ul className="issue-list">
              {warnings.map((warning, index) => (
                <li key={`${warning}-${index}`} className="issue-list__item">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
