export default function WellInfoPanel({
  wells,
  selectedWells,
  omittedWells,
  onToggleOmit,
}) {
  const selected = [...selectedWells]
    .sort((a, b) => a - b)
    .map((idx) => wells.find((w) => w.index === idx))
    .filter(Boolean);

  if (!selected.length) {
    return (
      <div className="well-info well-info--empty">
        <p>Click a well to view details. Shift-click to select a range.</p>
      </div>
    );
  }

  if (selected.length > 1) {
    return (
      <div className="well-info">
        <h3 className="well-info__title">
          {selected.length} wells selected
        </h3>
        <p className="well-info__positions">
          {selected.map((w) => w.position).join(', ')}
        </p>
      </div>
    );
  }

  const well = selected[0];

  return (
    <div className="well-info">
      <h3 className="well-info__title">
        Well {well.position}
        {well.sampleName && (
          <span className="well-info__sample"> — {well.sampleName}</span>
        )}
      </h3>

      {well.reactions.length === 0 ? (
        <p className="well-info__empty">Empty well</p>
      ) : (
        <table className="well-info__table">
          <thead>
            <tr>
              <th>Target</th>
              <th>Cq</th>
              <th>Confidence</th>
              <th>Amp Status</th>
              <th>Flags</th>
              <th>Omit</th>
            </tr>
          </thead>
          <tbody>
            {well.reactions.map((r) => {
              const omitKey = `${well.index}-${r.targetName}`;
              const omitted = omittedWells.has(omitKey);
              return (
                <tr key={r.targetName} className={omitted ? 'row-omitted' : ''}>
                  <td>{r.targetName}</td>
                  <td className="mono">
                    {r.cq !== null ? r.cq.toFixed(2) : '—'}
                  </td>
                  <td className="mono">
                    {r.cqConf !== null ? r.cqConf.toFixed(2) : '—'}
                  </td>
                  <td>{r.ampStatus || '—'}</td>
                  <td>
                    {r.flags?.length
                      ? r.flags.map((f) => (
                          <span key={f} className="flag">
                            {f}
                          </span>
                        ))
                      : '—'}
                  </td>
                  <td>
                    <label className="omit-toggle">
                      <input
                        type="checkbox"
                        checked={omitted}
                        onChange={() => onToggleOmit(well.index, r.targetName)}
                      />
                      Omit
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {well.reactions.some((r) =>
        omittedWells.has(`${well.index}-${r.targetName}`)
      ) && (
        <p className="well-info__omit-note">
          Omitted from CT calculation and charts
        </p>
      )}
    </div>
  );
}
