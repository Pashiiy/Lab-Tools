function getFlag(row) {
  if (!row.warning) return null;
  if (/No SD available/i.test(row.warning)) {
    return { type: 'warn', label: 'NO SD', title: row.warning };
  }
  if (/reference gene/i.test(row.warning)) {
    return { type: 'error', label: 'MISSING REF', title: row.warning };
  }
  if (/Missing/i.test(row.warning)) {
    return { type: 'error', label: 'MISSING TARGET', title: row.warning };
  }
  return { type: 'warn', label: 'WARN', title: row.warning };
}

function ddCtClass(value) {
  if (value === null) return '';
  if (Math.abs(value) < 0.0001) return 'qi-ddct-neutral';
  return value < 0 ? 'qi-ddct-up' : 'qi-ddct-down';
}

function foldChangeClass(value, isCalibrator) {
  if (value === null) return '';
  if (isCalibrator || Math.abs(value - 1) < 0.0001) return 'qi-ddct-neutral';
  return value > 1 ? 'qi-ddct-up' : 'qi-ddct-down';
}

export default function ResultsTable({
  ddCtResults,
  averagedData,
  referenceGene,
  sampleColors,
  calibratorSample,
}) {
  const hasCalibrator = !!calibratorSample;

  const meanCqLookup = {};
  averagedData.forEach((row) => {
    if (!meanCqLookup[row.sampleName]) meanCqLookup[row.sampleName] = {};
    meanCqLookup[row.sampleName][row.targetName] = row.meanCq;
  });

  const sorted = [...ddCtResults].sort((a, b) => {
    const s = a.sample.localeCompare(b.sample);
    return s !== 0 ? s : a.target.localeCompare(b.target);
  });

  return (
    <div className="qi-ddct-results">
      <p className="qi-ddct-ref-note">
        <strong>{referenceGene}</strong> (reference gene) is excluded from this table — each
        sample&apos;s {referenceGene} measurement was used to normalize its own target values.
      </p>
      <div className="qi-table-wrap">
        <table className="qi-table qi-ddct-table">
          <thead>
            <tr>
              <th>Sample</th>
              <th>Target</th>
              <th>Mean Cq</th>
              <th>ΔCt</th>
              <th>RQ</th>
              {hasCalibrator && (
                <>
                  <th>ΔΔCt</th>
                  <th>Fold Change</th>
                </>
              )}
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const flag = getFlag(row);
              const meanCq = meanCqLookup[row.sample]?.[row.target];
              const isCalibratorRow = hasCalibrator && row.sample === calibratorSample;
              const borderColor = sampleColors[row.sample] || 'var(--qi-border)';

              return (
                <tr
                  key={`${row.sample}-${row.target}`}
                  className={isCalibratorRow ? 'qi-ddct-row--calibrator' : ''}
                  style={{ borderLeftColor: borderColor }}
                >
                  <td>{row.sample}</td>
                  <td>{row.target}</td>
                  <td className="qi-mono">
                    {meanCq != null ? meanCq.toFixed(3) : '—'}
                  </td>
                  <td className="qi-mono">
                    {row.deltaCt != null ? row.deltaCt.toFixed(4) : '—'}
                  </td>
                  <td className="qi-mono qi-ddct-rq-primary">
                    {row.rq != null ? (
                      <>
                        {row.rq.toFixed(4)}
                        {(row.rqErrorPlus != null || row.rqErrorMinus != null) && (
                          <span className="qi-ddct-rq-err">
                            ±
                            {Math.max(row.rqErrorPlus ?? 0, row.rqErrorMinus ?? 0).toFixed(4)}
                          </span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  {hasCalibrator && (
                    <>
                      <td className={`qi-mono ${ddCtClass(row.ddCt)}`}>
                        {row.ddCt != null ? row.ddCt.toFixed(4) : '—'}
                      </td>
                      <td
                        className={`qi-mono ${foldChangeClass(row.foldChange, row.isCalibrator)}`}
                      >
                        {row.foldChange != null ? (
                          <>
                            {row.foldChange.toFixed(4)}
                            {row.isCalibrator && (
                              <span className="qi-ddct-calibrator-label"> (calibrator)</span>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    </>
                  )}
                  <td className="qi-flags-cell">
                    {flag && (
                      <span
                        className={`qi-flag qi-flag--${flag.type === 'error' ? 'undet' : 'warn'}`}
                        title={flag.title}
                      >
                        {flag.label}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
