export default function DataPreview({ headers, rows, totalRows }) {
  if (!headers.length) return null;

  return (
    <section className="fg-preview">
      <h3 className="fg-section-title">
        Data Preview
        <span className="fg-meta">{totalRows} rows · {headers.length} columns</span>
      </h3>
      <div className="fg-table-wrap">
        <table className="fg-table">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {headers.map((h) => (
                  <td key={h}>{row[h] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalRows > rows.length && (
        <p className="fg-preview__more">Showing first {rows.length} of {totalRows} rows</p>
      )}
    </section>
  );
}
