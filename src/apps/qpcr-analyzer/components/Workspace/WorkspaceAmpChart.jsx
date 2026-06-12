import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { getDisplayValues } from '../../utils/computeCt';
import { getSeriesColor } from '../../utils/workspaceFilters';
import ThresholdDragOverlay from '../AmplificationTab/ThresholdDragOverlay';

const CHART_HEIGHT = 340;
const MARGIN = { top: 16, right: 120, bottom: 28, left: 56 };

export default function WorkspaceAmpChart({
  experiment,
  visibleSeries,
  displayMode,
  chartColorBy,
  sampleColors,
  targetColors,
  plateSelectedWells,
  omittedWells,
  thresholds,
  activeTarget,
  onThresholdChange,
  logScale,
}) {
  const cycleCount = experiment.cycleCount ?? 40;

  const chartData = useMemo(() => {
    return Array.from({ length: cycleCount }, (_, i) => {
      const entry = { cycle: i };
      visibleSeries.forEach((s) => {
        const values = getDisplayValues(s.reaction, displayMode);
        entry[s.key] = values[i] ?? null;
      });
      return entry;
    });
  }, [visibleSeries, displayMode, cycleCount]);

  const { yMin, yMax } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    chartData.forEach((row) => {
      visibleSeries.forEach((s) => {
        const v = row[s.key];
        if (v != null && !Number.isNaN(v) && v > 0) {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      });
    });
    if (!Number.isFinite(min)) return { yMin: 0.001, yMax: 1 };
    if (logScale) {
      const lo = Math.max(min * 0.5, 0.001);
      const hi = max * 2;
      return { yMin: lo, yMax: hi };
    }
    const pad = (max - min) * 0.08 || 0.1;
    return { yMin: min - pad, yMax: max + pad };
  }, [chartData, visibleSeries, logScale]);

  const threshold = activeTarget ? thresholds[activeTarget] ?? 0.2 : null;

  const legendPayload = useMemo(() => {
    const seen = new Set();
    return visibleSeries
      .filter((s) => {
        const label =
          chartColorBy === 'well'
            ? s.position
            : chartColorBy === 'sample'
              ? s.sampleName
              : s.targetName;
        const id = `${chartColorBy}-${label}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 12)
      .map((s) => ({
        value:
          chartColorBy === 'well'
            ? s.position
            : chartColorBy === 'sample'
              ? s.sampleName
              : s.targetName,
        color: getSeriesColor(s, chartColorBy, sampleColors, targetColors),
      }));
  }, [visibleSeries, chartColorBy, sampleColors, targetColors]);

  const hasCurveData = visibleSeries.some(
    (s) => s.reaction.deltaRn?.length || s.reaction.rn?.length
  );

  if (!hasCurveData) {
    return (
      <div className="ws-chart-empty">
        <p>No amplification curve data for current selection.</p>
        <p className="ws-chart-empty__hint">
          Load an .eds file or adjust sample/target filters.
        </p>
      </div>
    );
  }

  return (
    <div className="ws-chart-wrap">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={chartData} margin={MARGIN}>
          <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="cycle"
            label={{
              value: 'Cycle',
              position: 'insideBottom',
              offset: -8,
              fill: '#888',
              fontSize: 11,
            }}
            tick={{ fill: '#888', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <YAxis
            scale={logScale ? 'log' : 'auto'}
            domain={logScale ? [yMin, yMax] : [yMin, yMax]}
            allowDataOverflow
            tick={{ fill: '#888', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            label={{
              value: logScale ? 'Log ΔRn' : displayMode,
              angle: -90,
              position: 'insideLeft',
              fill: '#888',
              fontSize: 10,
            }}
          />
          <Tooltip
            contentStyle={{
              background: '#161B22',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              fontSize: 10,
            }}
            labelFormatter={(c) => `Cycle ${c}`}
          />
          <Legend payload={legendPayload} wrapperStyle={{ fontSize: 10 }} />
          {visibleSeries.map((s) => {
            const selected = plateSelectedWells.has(s.wellIndex);
            const omitted = omittedWells.has(s.key);
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={`${s.position} ${s.targetName}`}
                dot={false}
                strokeWidth={selected ? 2.5 : 1}
                stroke={getSeriesColor(s, chartColorBy, sampleColors, targetColors)}
                opacity={omitted ? 0.15 : selected || plateSelectedWells.size === 0 ? 1 : 0.35}
                connectNulls
                isAnimationActive={false}
              />
            );
          })}
          {threshold != null && displayMode !== 'Rn' && (
            <ReferenceLine
              y={logScale ? Math.log10(Math.max(threshold, 0.001)) : threshold}
              stroke="var(--accent)"
              strokeWidth={2}
              strokeDasharray="6 3"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {threshold != null && displayMode !== 'Rn' && !logScale && (
        <ThresholdDragOverlay
          yMin={yMin}
          yMax={yMax}
          threshold={threshold}
          onChange={onThresholdChange}
          height={CHART_HEIGHT}
          marginTop={MARGIN.top}
          marginBottom={MARGIN.bottom}
        />
      )}
    </div>
  );
}
