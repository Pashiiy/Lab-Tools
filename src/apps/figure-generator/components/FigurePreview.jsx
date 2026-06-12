import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ErrorBar,
  Cell,
} from 'recharts';
import { aggregateForBar, groupNumeric, mean, stdDev } from '../utils/statistics';
import { CHART_COLORS } from '../utils/chartTypes';

function boxStats(values) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  const n = sorted.length;
  if (!n) return null;
  const q = (p) => {
    const pos = (n - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base] + rest * (sorted[base + 1] - sorted[base] ?? 0);
  };
  return {
    min: sorted[0],
    q1: q(0.25),
    median: q(0.5),
    q3: q(0.75),
    max: sorted[n - 1],
    mean: mean(sorted),
  };
}

function buildHistogram(rows, yCol, bins) {
  const values = rows.map((r) => Number(r[yCol])).filter(Number.isFinite);
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / bins || 1;
  const counts = Array(bins).fill(0);
  values.forEach((v) => {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  });
  return counts.map((count, i) => ({
    bin: `${(min + i * width).toFixed(1)}–${(min + (i + 1) * width).toFixed(1)}`,
    count,
    mid: min + (i + 0.5) * width,
  }));
}

function kdePoints(values, steps = 40) {
  const sorted = values.filter(Number.isFinite);
  if (sorted.length < 2) return [];
  const min = Math.min(...sorted);
  const max = Math.max(...sorted);
  const range = max - min || 1;
  const bandwidth = stdDev(sorted) || range * 0.15;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = min + (range * i) / steps;
    let density = 0;
    sorted.forEach((v) => {
      const u = (x - v) / bandwidth;
      density += Math.exp(-0.5 * u * u);
    });
    density /= sorted.length * bandwidth * Math.sqrt(2 * Math.PI);
    pts.push({ x, density });
  }
  const maxD = Math.max(...pts.map((p) => p.density), 0.001);
  return pts.map((p) => ({ ...p, density: p.density / maxD }));
}

function CustomBoxPlot({ data, fontSize }) {
  const w = 40;
  return (
    <g>
      {data.map((item, i) => {
        const cx = 60 + i * 80;
        const scale = (v) => 300 - ((v - item.yMin) / (item.yMax - item.yMin || 1)) * 240;
        const yQ1 = scale(item.q1);
        const yQ3 = scale(item.q3);
        const yMed = scale(item.median);
        const yMin = scale(item.min);
        const yMax = scale(item.max);
        return (
          <g key={item.x}>
            <line x1={cx} y1={yMin} x2={cx} y2={yMax} stroke="var(--fg-chart-stroke)" strokeWidth={1.5} />
            <line x1={cx - w / 4} y1={yMin} x2={cx + w / 4} y2={yMin} stroke="var(--fg-chart-stroke)" strokeWidth={1.5} />
            <line x1={cx - w / 4} y1={yMax} x2={cx + w / 4} y2={yMax} stroke="var(--fg-chart-stroke)" strokeWidth={1.5} />
            <rect x={cx - w / 2} y={yQ3} width={w} height={Math.max(yQ1 - yQ3, 1)} fill={item.color} opacity={0.55} stroke="var(--fg-chart-stroke)" />
            <line x1={cx - w / 2} y1={yMed} x2={cx + w / 2} y2={yMed} stroke="var(--fg-chart-stroke)" strokeWidth={2} />
            <text x={cx} y={330} textAnchor="middle" fill="var(--fg-chart-label)" fontSize={fontSize - 1}>{item.x}</text>
          </g>
        );
      })}
    </g>
  );
}

function CustomViolinPlot({ data, fontSize }) {
  return (
    <g>
      {data.map((item, i) => {
        const cx = 60 + i * 90;
        const pts = item.kde;
        const maxW = 28;
        const yScale = (v) => 300 - ((v - item.yMin) / (item.yMax - item.yMin || 1)) * 240;
        const left = pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${cx - p.density * maxW},${yScale(p.x)}`).join(' ');
        const right = [...pts].reverse().map((p) => `L${cx + p.density * maxW},${yScale(p.x)}`).join(' ');
        const path = `${left} ${right} Z`;
        return (
          <g key={item.x}>
            <path d={path} fill={item.color} opacity={0.5} stroke="var(--fg-chart-stroke)" strokeWidth={1} />
            <line x1={cx} y1={yScale(item.median)} x2={cx} y2={yScale(item.median)} stroke="var(--fg-chart-stroke)" strokeWidth={2.5} />
            <text x={cx} y={330} textAnchor="middle" fill="var(--fg-chart-label)" fontSize={fontSize - 1}>{item.x}</text>
          </g>
        );
      })}
    </g>
  );
}

export default function FigurePreview({ rows, config }) {
  const chartContent = useMemo(() => {
    const { chartType, xColumn, yColumn, groupColumn, errorMode, histogramBins } = config;
    if (!xColumn || !yColumn || !rows.length) return null;

    const tickStyle = { fontSize: config.fontSize, fill: 'var(--fg-chart-label)' };
    const legendProps = config.showLegend
      ? {
          verticalAlign: config.legendPosition === 'top' || config.legendPosition === 'bottom' ? config.legendPosition : 'middle',
          align: config.legendPosition === 'left' || config.legendPosition === 'right' ? config.legendPosition : 'center',
          wrapperStyle: { fontSize: config.fontSize },
        }
      : null;

    if (chartType === 'scatter') {
      const data = rows
        .map((r) => ({
          x: Number(r[xColumn]),
          y: Number(r[yColumn]),
          group: groupColumn ? String(r[groupColumn] ?? '') : null,
        }))
        .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));
      const groups = groupColumn
        ? [...new Set(data.map((d) => d.group))]
        : ['all'];
      return (
        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
          <CartesianGrid stroke="var(--fg-chart-grid)" />
          <XAxis type="number" dataKey="x" name={config.xLabel} tick={tickStyle} label={{ value: config.xLabel, position: 'bottom', offset: 0, style: tickStyle }} />
          <YAxis type="number" dataKey="y" name={config.yLabel} tick={tickStyle} label={{ value: config.yLabel, angle: -90, position: 'insideLeft', style: tickStyle }} />
          <Tooltip />
          {legendProps && <Legend {...legendProps} />}
          {groups.map((g, i) => (
            <Scatter
              key={g}
              name={g === 'all' ? config.yLabel : g}
              data={g === 'all' ? data : data.filter((d) => d.group === g)}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
            />
          ))}
        </ScatterChart>
      );
    }

    if (chartType === 'line') {
      const agg = aggregateForBar(rows, xColumn, yColumn, groupColumn, errorMode);
      const groups = groupColumn ? [...new Set(agg.map((d) => d.group))] : [null];
      const xLabels = [...new Set(agg.map((d) => d.x))];
      const data = xLabels.map((x) => {
        const row = { x };
        agg.filter((d) => d.x === x).forEach((d) => {
          const key = d.group ?? 'y';
          row[key] = d.y;
          row[`${key}_err`] = d.error;
        });
        return row;
      });
      return (
        <LineChart data={data} margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
          <CartesianGrid stroke="var(--fg-chart-grid)" />
          <XAxis dataKey="x" tick={tickStyle} label={{ value: config.xLabel, position: 'bottom', offset: 0, style: tickStyle }} />
          <YAxis tick={tickStyle} label={{ value: config.yLabel, angle: -90, position: 'insideLeft', style: tickStyle }} />
          <Tooltip />
          {legendProps && <Legend {...legendProps} />}
          {groups.map((g, i) => {
            const key = g ?? 'y';
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={g ?? config.yLabel}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            );
          })}
        </LineChart>
      );
    }

    if (chartType === 'histogram') {
      const data = buildHistogram(rows, yColumn, histogramBins);
      return (
        <BarChart data={data} margin={{ top: 20, right: 30, bottom: 50, left: 50 }}>
          <CartesianGrid stroke="var(--fg-chart-grid)" />
          <XAxis dataKey="bin" tick={tickStyle} angle={-25} textAnchor="end" height={60} label={{ value: config.yLabel, position: 'bottom', offset: 10, style: tickStyle }} />
          <YAxis tick={tickStyle} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: tickStyle }} />
          <Tooltip />
          <Bar dataKey="count" fill={CHART_COLORS[0]} />
        </BarChart>
      );
    }

    if (chartType === 'box' || chartType === 'violin') {
      const groups = groupNumeric(rows, xColumn, yColumn, groupColumn || xColumn);
      const allVals = groups.flatMap((g) => g.values);
      const yMin = Math.min(...allVals);
      const yMax = Math.max(...allVals);
      const enriched = groups.map((g, i) => {
        const stats = boxStats(g.values);
        return {
          x: g.group,
          ...stats,
          kde: kdePoints(g.values),
          yMin,
          yMax,
          color: CHART_COLORS[i % CHART_COLORS.length],
        };
      });
      const width = Math.max(groups.length * 80 + 80, 400);
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} 360`} preserveAspectRatio="xMidYMid meet">
          <text x={width / 2} y={18} textAnchor="middle" fill="var(--fg-chart-label)" fontSize={config.fontSize}>{config.yLabel}</text>
          {chartType === 'box' ? (
            <CustomBoxPlot data={enriched} fontSize={config.fontSize} />
          ) : (
            <CustomViolinPlot data={enriched} fontSize={config.fontSize} />
          )}
        </svg>
      );
    }

    const isGrouped = chartType === 'groupedBar' && groupColumn;
    const agg = aggregateForBar(rows, xColumn, yColumn, isGrouped ? groupColumn : '', errorMode);
    const groups = isGrouped ? [...new Set(agg.map((d) => d.group))] : [null];
    const xLabels = [...new Set(agg.map((d) => d.x))];
    const data = xLabels.map((x) => {
      const row = { x };
      agg.filter((d) => d.x === x).forEach((d) => {
        const key = d.group ?? 'y';
        row[key] = d.y;
        row[`${key}_err`] = [d.error, d.error];
      });
      return row;
    });

    return (
      <BarChart data={data} margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
        <CartesianGrid stroke="var(--fg-chart-grid)" />
        <XAxis dataKey="x" tick={tickStyle} label={{ value: config.xLabel, position: 'bottom', offset: 0, style: tickStyle }} />
        <YAxis tick={tickStyle} label={{ value: config.yLabel, angle: -90, position: 'insideLeft', style: tickStyle }} />
        <Tooltip />
        {legendProps && <Legend {...legendProps} />}
        {groups.map((g, i) => {
          const key = g ?? 'y';
          return (
            <Bar key={key} dataKey={key} name={g ?? config.yLabel} fill={CHART_COLORS[i % CHART_COLORS.length]}>
              {errorMode !== 'none' && <ErrorBar dataKey={`${key}_err`} width={4} strokeWidth={1.5} />}
              {!isGrouped && data.map((_, j) => (
                <Cell key={j} fill={CHART_COLORS[j % CHART_COLORS.length]} />
              ))}
            </Bar>
          );
        })}
      </BarChart>
    );
  }, [rows, config]);

  if (!chartContent) {
    return (
      <div className="fg-chart-empty">
        Select X and Y columns to preview your figure
      </div>
    );
  }

  const isCustomSvg = config.chartType === 'box' || config.chartType === 'violin';

  return (
    <div
      className="fg-chart-frame"
      style={{ width: config.width, height: config.height }}
    >
      {config.title && (
        <h4
          className="fg-chart-title"
          style={{ fontSize: config.titleSize }}
        >
          {config.title}
        </h4>
      )}
      {isCustomSvg ? (
        <div className="fg-chart-svg-wrap">{chartContent}</div>
      ) : (
        <ResponsiveContainer width="100%" height="calc(100% - 2rem)">
          {chartContent}
        </ResponsiveContainer>
      )}
    </div>
  );
}
