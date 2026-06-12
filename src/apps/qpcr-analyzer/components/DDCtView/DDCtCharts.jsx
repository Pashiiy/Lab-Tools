import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ErrorBar,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

const CHART_TYPES = [
  { id: 'bar', label: 'Bar Chart' },
  { id: 'dot', label: 'Dot Plot' },
  { id: 'heatmap', label: 'Heatmap' },
];

function foldChangeToColor(fc) {
  if (fc === null) return null;
  if (fc === 1) return '#333344';
  if (fc > 1) {
    const intensity = Math.min((fc - 1) / 9, 1);
    const r = Math.round(88 * intensity);
    const g = Math.round(166 * intensity);
    const b = Math.round(255 * intensity);
    return `rgba(${r},${g},${b},${0.2 + intensity * 0.8})`;
  }
  const intensity = Math.min((1 - fc) / 0.9, 1);
  const r = Math.round(248 * intensity);
  const g = Math.round(81 * intensity);
  const b = Math.round(73 * intensity);
  return `rgba(${r},${g},${b},${0.2 + intensity * 0.8})`;
}

function GroupedBarChart({ ddCtResults, sampleColors, controlSample }) {
  const { chartData, samples, targets } = useMemo(() => {
    const sampleSet = new Set();
    const targetSet = new Set();
    ddCtResults.forEach((r) => {
      sampleSet.add(r.sample);
      targetSet.add(r.target);
    });
    const samples = [...sampleSet].sort();
    const targets = [...targetSet].sort();

    const chartData = targets.map((target) => {
      const entry = { target };
      samples.forEach((sample) => {
        const result = ddCtResults.find(
          (r) => r.sample === sample && r.target === target
        );
        entry[sample] = result?.foldChange ?? null;
        entry[`${sample}_error`] = result
          ? [result.errorMinus ?? 0, result.errorPlus ?? 0]
          : [0, 0];
      });
      return entry;
    });

    return { chartData, samples, targets };
  }, [ddCtResults]);

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis
          dataKey="target"
          tick={{ fill: '#8B949E', fontSize: 11 }}
        />
        <YAxis
          tick={{ fill: '#8B949E', fontSize: 11 }}
          label={{
            value: 'Fold Change (2^−ΔΔCt)',
            angle: -90,
            position: 'insideLeft',
            fill: '#8B949E',
            fontSize: 11,
          }}
        />
        <Tooltip
          contentStyle={{
            background: '#161B22',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            color: '#E6EDF3',
          }}
          formatter={(value, name, props) => {
            const result = ddCtResults.find(
              (r) => r.sample === name && r.target === props.payload.target
            );
            if (!result) return [value, name];
            const err =
              result.errorPlus != null
                ? ` ±${result.errorPlus.toFixed(3)}`
                : '';
            return [`${value?.toFixed?.(4) ?? value}${err}`, name];
          }}
        />
        <Legend />
        <ReferenceLine
          y={1}
          stroke="#8B949E"
          strokeDasharray="4 4"
          label={{ value: 'No change', fill: '#8B949E', fontSize: 10 }}
        />
        {samples.map((sample) => (
          <Bar
            key={sample}
            dataKey={sample}
            fill={sampleColors[sample] || '#58A6FF'}
            opacity={sample === controlSample ? 0.65 : 1}
          >
            <ErrorBar dataKey={`${sample}_error`} width={4} strokeWidth={1} />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function DeltaCtDotPlot({ rawData, referenceGene, sampleColors, uniqueTargets }) {
  const [targetFilter, setTargetFilter] = useState('');

  const targets = useMemo(
    () => uniqueTargets.filter((t) => t !== referenceGene),
    [uniqueTargets, referenceGene]
  );

  const activeTarget = targetFilter || targets[0] || '';

  const { points, xLabels } = useMemo(() => {
    const refBySample = {};
    rawData.forEach((row) => {
      if (
        row.targetName === referenceGene &&
        row.ct !== null &&
        !row.isNTC
      ) {
        if (!refBySample[row.sampleName]) refBySample[row.sampleName] = [];
        refBySample[row.sampleName].push(row.ct);
      }
    });
    const refMean = {};
    Object.entries(refBySample).forEach(([s, cts]) => {
      refMean[s] = cts.reduce((a, b) => a + b, 0) / cts.length;
    });

    const samples = [...new Set(rawData.map((r) => r.sampleName))]
      .filter((s) => refMean[s] !== undefined)
      .sort();

    const points = [];
    samples.forEach((sample, si) => {
      rawData.forEach((row) => {
        if (
          row.sampleName !== sample ||
          row.isNTC ||
          row.targetName !== activeTarget ||
          row.ct === null
        ) {
          return;
        }
        points.push({
          x: si,
          y: row.ct - refMean[sample],
          sample,
          fill: sampleColors[sample] || '#58A6FF',
        });
      });
    });

    return { points, xLabels: samples };
  }, [rawData, referenceGene, activeTarget, sampleColors]);

  if (!activeTarget) {
    return <p className="chart-empty">Select a reference gene to view ΔCt spread.</p>;
  }

  return (
    <div>
      <div className="chart-target-filter">
        <label>
          Target:
          <select value={activeTarget} onChange={(e) => setTargetFilter(e.target.value)}>
            {targets.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 16, right: 24, left: 8, bottom: 32 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[-0.5, Math.max(xLabels.length - 0.5, 0.5)]}
            ticks={xLabels.map((_, i) => i)}
            tickFormatter={(i) => xLabels[i] ?? ''}
            tick={{ fill: '#8B949E', fontSize: 10 }}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis
            dataKey="y"
            tick={{ fill: '#8B949E', fontSize: 11 }}
            label={{
              value: 'ΔCt',
              angle: -90,
              position: 'insideLeft',
              fill: '#8B949E',
              fontSize: 11,
            }}
          />
          <ZAxis range={[40, 40]} />
          <Tooltip
            contentStyle={{
              background: '#161B22',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
            }}
            formatter={(value, _name, props) => [
              value.toFixed(3),
              `${props.payload.sample} ΔCt`,
            ]}
          />
          {[...new Set(points.map((p) => p.sample))].map((sample) => (
            <Scatter
              key={sample}
              name={sample}
              data={points.filter((p) => p.sample === sample)}
              fill={sampleColors[sample] || '#58A6FF'}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function FoldChangeHeatmap({ ddCtResults, sampleColors }) {
  const { samples, targets, lookup } = useMemo(() => {
    const sampleSet = new Set();
    const targetSet = new Set();
    const lookup = {};
    ddCtResults.forEach((r) => {
      sampleSet.add(r.sample);
      targetSet.add(r.target);
      lookup[`${r.sample}||${r.target}`] = r.foldChange;
    });
    return {
      samples: [...sampleSet].sort(),
      targets: [...targetSet].sort(),
      lookup,
    };
  }, [ddCtResults]);

  const cellW = 72;
  const cellH = 36;
  const labelW = 100;
  const labelH = 28;
  const width = labelW + targets.length * cellW + 16;
  const height = labelH + samples.length * cellH + 48;

  return (
    <div className="heatmap-wrap">
      <svg width={width} height={height} className="heatmap">
        {targets.map((t, ti) => (
          <text
            key={t}
            x={labelW + ti * cellW + cellW / 2}
            y={labelH - 8}
            textAnchor="middle"
            fill="#8B949E"
            fontSize={10}
          >
            {t}
          </text>
        ))}
        {samples.map((s, si) => (
          <text
            key={s}
            x={labelW - 8}
            y={labelH + si * cellH + cellH / 2 + 4}
            textAnchor="end"
            fill={sampleColors[s] || '#8B949E'}
            fontSize={10}
          >
            {s}
          </text>
        ))}
        {samples.map((s, si) =>
          targets.map((t, ti) => {
            const fc = lookup[`${s}||${t}`] ?? null;
            const x = labelW + ti * cellW;
            const y = labelH + si * cellH;
            const fill = foldChangeToColor(fc);

            return (
              <g key={`${s}||${t}`}>
                <rect
                  x={x}
                  y={y}
                  width={cellW - 2}
                  height={cellH - 2}
                  fill={fill ?? '#21262D'}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                />
                {fc === null && (
                  <line
                    x1={x}
                    y1={y}
                    x2={x + cellW - 2}
                    y2={y + cellH - 2}
                    stroke="#8B949E"
                    strokeWidth={1}
                    opacity={0.4}
                  />
                )}
                {fc !== null && (
                  <text
                    x={x + (cellW - 2) / 2}
                    y={y + cellH / 2 + 3}
                    textAnchor="middle"
                    fill="#E6EDF3"
                    fontSize={9}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {fc.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })
        )}
        <g transform={`translate(${labelW}, ${labelH + samples.length * cellH + 12})`}>
          <text x={0} y={0} fill="#8B949E" fontSize={10}>
            ↓ downregulated
          </text>
          <rect x={100} y={-10} width={120} height={10} fill="url(#fc-gradient)" />
          <defs>
            <linearGradient id="fc-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(248,81,73,0.9)" />
              <stop offset="50%" stopColor="#333344" />
              <stop offset="100%" stopColor="rgba(88,166,255,0.9)" />
            </linearGradient>
          </defs>
          <text x={230} y={0} fill="#8B949E" fontSize={10}>
            upregulated →
          </text>
        </g>
      </svg>
    </div>
  );
}

export default function DDCtCharts({
  ddCtResults,
  rawData,
  referenceGene,
  controlSample,
  sampleColors,
  uniqueTargets,
}) {
  const [chartType, setChartType] = useState('bar');

  if (!ddCtResults?.length) return null;

  return (
    <div className="ddct-charts">
      <div className="chart-type-bar">
        {CHART_TYPES.map((ct) => (
          <button
            key={ct.id}
            type="button"
            className={`chart-type-btn${chartType === ct.id ? ' chart-type-btn--active' : ''}`}
            onClick={() => setChartType(ct.id)}
          >
            {ct.label}
          </button>
        ))}
      </div>
      <div className="chart-panel">
        {chartType === 'bar' && (
          <GroupedBarChart
            ddCtResults={ddCtResults}
            sampleColors={sampleColors}
            controlSample={controlSample}
          />
        )}
        {chartType === 'dot' && (
          <DeltaCtDotPlot
            rawData={rawData}
            referenceGene={referenceGene}
            sampleColors={sampleColors}
            uniqueTargets={uniqueTargets}
          />
        )}
        {chartType === 'heatmap' && (
          <FoldChangeHeatmap ddCtResults={ddCtResults} sampleColors={sampleColors} />
        )}
      </div>
    </div>
  );
}
