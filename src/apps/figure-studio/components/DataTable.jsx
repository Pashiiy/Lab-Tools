import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ROW_H = 32;
const OVERSCAN = 8;
const VIRTUALIZE_AT = 80;

/**
 * Spreadsheet-style editable grid for Figure Studio datasets.
 * Large tables virtualize body rows for scroll performance.
 */
export default function DataTable({
  dataset,
  onSetCell,
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn,
  onRenameColumn,
  onPasteTable,
}) {
  const [sel, setSel] = useState({ r: 0, c: 0 });
  const [editing, setEditing] = useState(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(320);
  const tableRef = useRef(null);
  const scrollRef = useRef(null);
  const readOnly = dataset?.readOnly;

  const cols = dataset?.columns || [];
  const rows = dataset?.data || [];
  const virtualize = rows.length >= VIRTUALIZE_AT;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight || 320));
    ro.observe(el);
    setViewportH(el.clientHeight || 320);
    return () => ro.disconnect();
  }, [dataset?.id]);

  const range = useMemo(() => {
    if (!virtualize) return { start: 0, end: rows.length };
    const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
    const visible = Math.ceil(viewportH / ROW_H) + OVERSCAN * 2;
    const end = Math.min(rows.length, start + visible);
    return { start, end };
  }, [virtualize, scrollTop, viewportH, rows.length]);

  const commitEdit = useCallback(() => {
    if (!editing || readOnly) {
      setEditing(null);
      return;
    }
    onSetCell?.(editing.r, editing.c, editing.value);
    setEditing(null);
  }, [editing, onSetCell, readOnly]);

  const startEdit = (r, c) => {
    if (readOnly) return;
    setSel({ r, c });
    setEditing({ r, c, value: rows[r]?.[c] ?? '' });
  };

  const onKeyDown = (e) => {
    if (editing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
        setSel((s) => ({ r: Math.min(rows.length - 1, s.r + 1), c: s.c }));
      } else if (e.key === 'Escape') {
        setEditing(null);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        setSel((s) => ({
          r: s.r,
          c: Math.min(cols.length - 1, s.c + (e.shiftKey ? -1 : 1)),
        }));
      }
      return;
    }

    const { r, c } = sel;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel({ r: Math.max(0, r - 1), c });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel({ r: Math.min(rows.length - 1, r + 1), c });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSel({ r, c: Math.max(0, c - 1) });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSel({ r, c: Math.min(cols.length - 1, c + 1) });
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      startEdit(r, c);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!readOnly) {
        e.preventDefault();
        onSetCell?.(r, c, '');
      }
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !readOnly) {
      startEdit(r, c);
      setEditing({ r, c, value: e.key });
      e.preventDefault();
    }
  };

  const onPaste = (e) => {
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;
    if (text.includes('\t') || text.includes('\n')) {
      e.preventDefault();
      onPasteTable?.(text);
    }
  };

  if (!dataset) {
    return <p className="fs-empty">No dataset selected.</p>;
  }

  const visibleRows = rows.slice(range.start, range.end);
  const topPad = virtualize ? range.start * ROW_H : 0;
  const bottomPad = virtualize ? Math.max(0, (rows.length - range.end) * ROW_H) : 0;

  return (
    <div
      className={`fs-table-wrap${readOnly ? ' fs-table-wrap--readonly' : ''}`}
      tabIndex={0}
      ref={tableRef}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      role="grid"
      aria-label={dataset.name}
    >
      {readOnly && (
        <div className="fs-readonly-banner">
          <strong>Read-only dataset</strong>
          {dataset.source && <span> · Source: {dataset.source}</span>}
          {dataset.projectName && <span> · Project: {dataset.projectName}</span>}
          {dataset.generatedAt && (
            <span> · Generated: {new Date(dataset.generatedAt).toLocaleString()}</span>
          )}
          <span className="fs-readonly-banner__hint"> Duplicate the dataset to edit.</span>
        </div>
      )}
      <div
        className="fs-table-scroll"
        ref={scrollRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <table className="fs-table">
          <thead>
            <tr>
              <th className="fs-table__corner" />
              {cols.map((col, c) => (
                <th key={col.id} className="fs-table__colhead">
                  <input
                    className="fs-table__colname"
                    value={col.name}
                    disabled={readOnly}
                    onChange={(e) => onRenameColumn?.(c, e.target.value)}
                    aria-label={`Column ${c + 1} name`}
                  />
                  {!readOnly && (
                    <div className="fs-table__colactions">
                      <button type="button" title="Insert column before" onClick={() => onInsertColumn?.(c)}>
                        +
                      </button>
                      <button type="button" title="Delete column" onClick={() => onDeleteColumn?.(c)}>
                        −
                      </button>
                    </div>
                  )}
                </th>
              ))}
              {!readOnly && (
                <th className="fs-table__addcol">
                  <button type="button" className="lt-btn lt-btn--small" onClick={() => onInsertColumn?.(cols.length)}>
                    + Col
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {virtualize && topPad > 0 && (
              <tr aria-hidden="true" className="fs-table__pad">
                <td colSpan={cols.length + 2} style={{ height: topPad, padding: 0, border: 0 }} />
              </tr>
            )}
            {visibleRows.map((row, i) => {
              const r = range.start + i;
              return (
                <tr key={r} style={{ height: ROW_H }}>
                  <th className="fs-table__rowhead">
                    <span>{r + 1}</span>
                    {!readOnly && (
                      <span className="fs-table__rowactions">
                        <button type="button" title="Insert row above" onClick={() => onInsertRow?.(r)}>
                          +
                        </button>
                        <button type="button" title="Delete row" onClick={() => onDeleteRow?.(r)}>
                          −
                        </button>
                      </span>
                    )}
                  </th>
                  {cols.map((col, c) => {
                    const active = sel.r === r && sel.c === c;
                    const isEdit = editing && editing.r === r && editing.c === c;
                    return (
                      <td
                        key={col.id}
                        className={`fs-table__cell${active ? ' fs-table__cell--sel' : ''}`}
                        onClick={() => setSel({ r, c })}
                        onDoubleClick={() => startEdit(r, c)}
                      >
                        {isEdit ? (
                          <input
                            className="fs-table__edit"
                            autoFocus
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onBlur={commitEdit}
                          />
                        ) : (
                          row[c] ?? ''
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {virtualize && bottomPad > 0 && (
              <tr aria-hidden="true" className="fs-table__pad">
                <td colSpan={cols.length + 2} style={{ height: bottomPad, padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="fs-table-footer">
          <button type="button" className="lt-btn lt-btn--small" onClick={() => onInsertRow?.(rows.length)}>
            + Row
          </button>
          {virtualize && (
            <span className="fs-table-footer__meta">{rows.length.toLocaleString()} rows</span>
          )}
        </div>
      )}
    </div>
  );
}
