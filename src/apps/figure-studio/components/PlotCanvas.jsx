import { Fragment, useMemo } from 'react';
import {
  ResponsiveContainer,
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
  ErrorBar,
  AreaChart,
  Area,
} from 'recharts';
import { buildChartModel } from '../plotting/buildChartModel';
import { getPreset } from '../templates/presets';
import { cellNumber } from '../model/dataset';

export default function PlotCanvas({ dataset, plot, presetId }) {
  const preset = getPreset(presetId);
  const model = useMemo(() => buildChartModel(dataset, plot), [dataset, plot]);

  if (model.error) {
    return <div className="fs-plot-empty">{model.error}</div>;
  }

  const { points, series } = model;
  const commonAxis = {
    tick: { fill: preset.axisStroke, fontSize: preset.fontSize },
    stroke: preset.axisStroke,
  };

  const wrap = (child) => (
    <div
      className="fs-plot-canvas"
      data-fs-plot
      style={{ fontFamily: preset.fontFamily, fontSize: preset.fontSize }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {child}
      </ResponsiveContainer>
    </div>
  );

  if (plot.type === 'line') {
    return wrap(
      <LineChart data={points} margin={{ top: 16, right: 20, left: 8, bottom: 8 }}>
        {preset.grid && <CartesianGrid stroke={preset.gridStroke} strokeDasharray="3 3" />}
        <XAxis dataKey="name" {...commonAxis} />
        <YAxis {...commonAxis} />
        <Tooltip />
        {preset.legend && <Legend />}
        {series.map((g, i) => (
          <Line
            key={g}
            type="monotone"
            dataKey={g}
            stroke={preset.colors[i % preset.colors.length]}
            strokeWidth={preset.strokeWidth}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    );
  }

  if (plot.type === 'scatter') {
    // Flatten for scatter
    const flat = [];
    for (const row of dataset.data) {
      const xi = dataset.columns.findIndex((c) => c.id === plot.xColumnId);
      const yi = dataset.columns.findIndex((c) => c.id === plot.yColumnId);
      const x = cellNumber(row[xi]);
      const y = cellNumber(row[yi]);
      if (x == null || y == null) continue;
      flat.push({ x, y });
    }
    return wrap(
      <ScatterChart margin={{ top: 16, right: 20, left: 8, bottom: 8 }}>
        {preset.grid && <CartesianGrid stroke={preset.gridStroke} strokeDasharray="3 3" />}
        <XAxis type="number" dataKey="x" name="X" {...commonAxis} />
        <YAxis type="number" dataKey="y" name="Y" {...commonAxis} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={flat} fill={preset.colors[0]} />
      </ScatterChart>
    );
  }

  if (plot.type === 'area') {
    return wrap(
      <AreaChart data={points} margin={{ top: 16, right: 20, left: 8, bottom: 8 }}>
        {preset.grid && <CartesianGrid stroke={preset.gridStroke} strokeDasharray="3 3" />}
        <XAxis dataKey="name" {...commonAxis} />
        <YAxis {...commonAxis} />
        <Tooltip />
        {preset.legend && <Legend />}
        {series.map((g, i) => (
          <Area
            key={g}
            type="monotone"
            dataKey={g}
            stroke={preset.colors[i % preset.colors.length]}
            fill={preset.colors[i % preset.colors.length]}
            fillOpacity={0.25}
            strokeWidth={preset.strokeWidth}
          />
        ))}
      </AreaChart>
    );
  }

  if (plot.type === 'histogram') {
    const yi = dataset.columns.findIndex((c) => c.id === plot.yColumnId);
    const vals = dataset.data.map((r) => cellNumber(r[yi])).filter((n) => n != null);
    if (!vals.length) return <div className="fs-plot-empty">No numeric Y values</div>;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const bins = 10;
    const width = (max - min) / bins || 1;
    const hist = Array.from({ length: bins }, (_, i) => ({
      name: (min + i * width).toFixed(1),
      count: 0,
    }));
    for (const v of vals) {
      let idx = Math.floor((v - min) / width);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      hist[idx].count += 1;
    }
    return wrap(
      <BarChart data={hist} margin={{ top: 16, right: 20, left: 8, bottom: 8 }}>
        {preset.grid && <CartesianGrid stroke={preset.gridStroke} strokeDasharray="3 3" />}
        <XAxis dataKey="name" {...commonAxis} />
        <YAxis {...commonAxis} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill={preset.colors[0]} />
      </BarChart>
    );
  }

  if (plot.type === 'heatmap') {
    const xi = dataset.columns.findIndex((c) => c.id === plot.xColumnId);
    const yi = dataset.columns.findIndex((c) => c.id === plot.yColumnId);
    const gi = plot.groupColumnId
      ? dataset.columns.findIndex((c) => c.id === plot.groupColumnId)
      : -1;
    const cells = [];
    for (const row of dataset.data) {
      const x = row[xi];
      const y = cellNumber(row[yi]);
      if (x == null || y == null) continue;
      cells.push({ x: String(x), row: gi >= 0 ? String(row[gi]) : 'V', v: y });
    }
    if (!cells.length) return <div className="fs-plot-empty">No heatmap values</div>;
    const xs = [...new Set(cells.map((c) => c.x))];
    const ys = [...new Set(cells.map((c) => c.row))];
    const vmax = Math.max(...cells.map((c) => Math.abs(c.v)), 1);
    return (
      <div className="fs-plot-canvas fs-heatmap" style={{ fontFamily: preset.fontFamily }}>
        <div
          className="fs-heatmap__grid"
          style={{ gridTemplateColumns: `80px repeat(${xs.length}, 1fr)` }}
        >
          <div />
          {xs.map((x) => (
            <div key={x} className="fs-heatmap__xlabel">
              {x}
            </div>
          ))}
          {ys.map((y) => (
            <Fragment key={y}>
              <div className="fs-heatmap__ylabel">{y}</div>
              {xs.map((x) => {
                const hit = cells.find((c) => c.x === x && c.row === y);
                const v = hit?.v ?? 0;
                const t = Math.min(1, Math.abs(v) / vmax);
                const bg = `color-mix(in srgb, ${preset.colors[0]} ${Math.round(t * 100)}%, #f5f5f5)`;
                return (
                  <div
                    key={`${y}-${x}`}
                    className="fs-heatmap__cell"
                    style={{ background: bg }}
                    title={String(v)}
                  >
                    {hit ? v.toFixed(2) : '—'}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (plot.type === 'box') {
    return wrap(
      <BarChart data={points} margin={{ top: 16, right: 20, left: 8, bottom: 8 }}>
        {preset.grid && <CartesianGrid stroke={preset.gridStroke} strokeDasharray="3 3" />}
        <XAxis dataKey="name" {...commonAxis} />
        <YAxis {...commonAxis} />
        <Tooltip />
        {preset.legend && <Legend />}
        {series.map((g, i) => (
          <Bar key={g} dataKey={g} fill={preset.colors[i % preset.colors.length]}>
            <ErrorBar dataKey={`${g}_err`} width={4} stroke={preset.axisStroke} />
          </Bar>
        ))}
      </BarChart>
    );
  }

  // Default: bar (grouped / stacked / horizontal)
  return wrap(
    <BarChart
      data={points}
      layout={plot.horizontal ? 'vertical' : 'horizontal'}
      margin={{ top: 16, right: 20, left: 8, bottom: 8 }}
    >
      {preset.grid && <CartesianGrid stroke={preset.gridStroke} strokeDasharray="3 3" />}
      {plot.horizontal ? (
        <>
          <XAxis type="number" {...commonAxis} />
          <YAxis type="category" dataKey="name" width={72} {...commonAxis} />
        </>
      ) : (
        <>
          <XAxis dataKey="name" {...commonAxis} />
          <YAxis {...commonAxis} />
        </>
      )}
      <Tooltip />
      {preset.legend && <Legend />}
      {series.map((g, i) => (
        <Bar
          key={g}
          dataKey={g}
          stackId={plot.stacked ? 'a' : undefined}
          fill={preset.colors[i % preset.colors.length]}
          radius={plot.stacked ? 0 : [3, 3, 0, 0]}
        >
          <ErrorBar dataKey={`${g}_err`} width={4} stroke={preset.axisStroke} />
        </Bar>
      ))}
    </BarChart>
  );
}
