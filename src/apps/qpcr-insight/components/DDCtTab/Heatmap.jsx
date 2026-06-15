import { useMemo, useState } from 'react';

export function foldChangeToColor(fc) {
  if (fc === null) return null;
  if (Math.abs(fc - 1) < 0.001) return 'rgba(255,255,255,0.06)';
  if (fc > 1) {
    const intensity = Math.min((fc - 1) / 4, 1);
    return `rgba(96, 165, 250, ${0.15 + intensity * 0.7})`;
  }
  const intensity = Math.min((1 - fc) / 0.9, 1);
  return `rgba(251, 146, 60, ${0.15 + intensity * 0.7})`;
}

export function rqToColor(rq, maxRq) {
  if (rq === null) return null;
  const intensity = Math.min(rq / (maxRq || 1), 1);
  return `rgba(45, 212, 191, ${0.1 + intensity * 0.75})`;
}

export default function Heatmap({ ddCtResults, calibratorSample }) {
  const hasCalibrator = !!calibratorSample;
  const [mode, setMode] = useState('rq');

  const samples = [...new Set(ddCtResults.map((r) => r.sample))].sort();
  const targets = [...new Set(ddCtResults.map((r) => r.target))].sort();

  const lookup = {};
  ddCtResults.forEach((r) => {
    if (!lookup[r.sample]) lookup[r.sample] = {};
    lookup[r.sample][r.target] = r;
  });

  const heatmapMode = hasCalibrator && mode === 'fc' ? 'fc' : 'rq';

  const maxRq = useMemo(() => {
    let max = 0;
    ddCtResults.forEach((r) => {
      if (r.rq != null && r.rq > max) max = r.rq;
    });
    return max;
  }, [ddCtResults]);

  const cellW = 88;
  const cellH = 36;
  const labelW = 120;
  const headerH = 28;
  const width = labelW + targets.length * cellW;
  const height = headerH + samples.length * cellH;

  return (
    <div className="qi-heatmap-panel">
      {hasCalibrator && (
        <div className="qi-heatmap-mode-toggle">
          <span className="qi-heatmap-mode-toggle__label">Show:</span>
          <button
            type="button"
            className={heatmapMode === 'rq' ? 'qi-heatmap-mode-toggle__btn--active' : ''}
            onClick={() => setMode('rq')}
          >
            RQ
          </button>
          <button
            type="button"
            className={heatmapMode === 'fc' ? 'qi-heatmap-mode-toggle__btn--active' : ''}
            onClick={() => setMode('fc')}
          >
            Fold Change
          </button>
        </div>
      )}

      <div className="qi-heatmap-wrap">
        <svg className="qi-heatmap" width={width} height={height}>
          {targets.map((target, ti) => (
            <text
              key={target}
              x={labelW + ti * cellW + cellW / 2}
              y={18}
              textAnchor="middle"
              className="qi-heatmap__header"
            >
              {target}
            </text>
          ))}
          {samples.map((sample, si) => {
            const y = headerH + si * cellH;
            const isCalibrator = hasCalibrator && sample === calibratorSample;
            return (
              <g key={sample}>
                <text x={4} y={y + cellH / 2 + 4} className="qi-heatmap__row-label">
                  {isCalibrator ? `★ ${sample}` : sample}
                </text>
                {targets.map((target, ti) => {
                  const result = lookup[sample]?.[target];
                  const value =
                    heatmapMode === 'fc' ? (result?.foldChange ?? null) : (result?.rq ?? null);
                  const fill =
                    heatmapMode === 'fc'
                      ? foldChangeToColor(value) || 'rgba(255,255,255,0.03)'
                      : rqToColor(value, maxRq) || 'rgba(255,255,255,0.03)';
                  const x = labelW + ti * cellW;
                  return (
                    <g key={target}>
                      <rect
                        x={x + 2}
                        y={y + 2}
                        width={cellW - 4}
                        height={cellH - 4}
                        rx={4}
                        fill={fill}
                        stroke="var(--qi-border)"
                        strokeWidth={1}
                      />
                      <text
                        x={x + cellW / 2}
                        y={y + cellH / 2 + 4}
                        textAnchor="middle"
                        className="qi-heatmap__value"
                      >
                        {value != null ? value.toFixed(2) : '—'}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
