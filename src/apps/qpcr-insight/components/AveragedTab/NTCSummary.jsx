import { useMemo } from 'react';

export default function NTCSummary({ replicates }) {
  const ntcRows = useMemo(() => {
    const groups = {};
    replicates
      .filter((r) => r.isNTC)
      .forEach((r) => {
        const key = r.targetName;
        if (!groups[key]) {
          groups[key] = { targetName: r.targetName, cqValues: [] };
        }
        if (r.cq !== null) groups[key].cqValues.push(r.cq);
      });

    return Object.values(groups).map((g) => {
      const n = g.cqValues.length;
      const mean = n > 0 ? g.cqValues.reduce((a, b) => a + b, 0) / n : null;
      const contaminated = mean !== null;
      return {
        targetName: g.targetName,
        meanCq: mean,
        contaminated,
      };
    });
  }, [replicates]);

  if (!ntcRows.length) return null;

  return (
    <section className="qi-card qi-ntc-card">
      <h3 className="qi-section-title">NTC Wells</h3>
      <div className="qi-table-wrap">
        <table className="qi-table">
          <thead>
            <tr>
              <th>Target</th>
              <th>Cq Mean</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            {ntcRows.map((row) => (
              <tr key={row.targetName}>
                <td>{row.targetName}</td>
                <td className="qi-mono">
                  {row.meanCq === null ? (
                    <span className="qi-text-undet">Undetermined</span>
                  ) : (
                    row.meanCq.toFixed(3)
                  )}
                </td>
                <td>
                  {row.contaminated ? (
                    <span className="qi-ntc-flag qi-ntc-flag--warn">
                      ⚠ Amplification detected in NTC
                    </span>
                  ) : (
                    <span className="qi-ntc-flag qi-ntc-flag--ok">✓ Clean</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
