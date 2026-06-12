import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { getDisplayValues } from '../../utils/computeCt';
import ThresholdDragOverlay from './ThresholdDragOverlay';

const CHART_HEIGHT = 420;
const MARGIN = { top: 20, right: 10, bottom: 30, left: 50 };

export default function AmpChart({
  experiment,
  activeTarget,
  displayMode,
  threshold,
  onThresholdChange,
  sampleColors,
  chartHighlightedWells,
  omittedWells,
}) {
  const wellsWithTarget = useMemo(
    () =>
      experiment.wells.filter((w) =>
        w.reactions.some((r) => r.targetName === activeTarget)
      ),
    [experiment, activeTarget]
  );

  const chartData = useMemo(() => {
    if (!experiment || !activeTarget) return [];
    return Array.from({ length: experiment.cycleCount }, (_, i) => {
      const entry = { cycle: i + 1 };
      experiment.wells.forEach((well) => {
        const reaction = well.reactions.find(
          (r) => r.targetName === activeTarget
        );
        if (!reaction) return;
        const values = getDisplayValues(reaction, displayMode);
        entry[`well_${well.index}`] = values[i] ?? null;
      });
      return entry;
    });
  }, [experiment, activeTarget, displayMode]);

  const { yMin, yMax } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    chartData.forEach((row) => {
      wellsWithTarget.forEach((well) => {
        const v = row[`well_${well.index}`];
        if (v != null && !Number.isNaN(v)) {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      });
    });
    if (!Number.isFinite(min)) return { yMin: 0, yMax: 1 };
    const pad = (max - min) * 0.08 || 0.1;
    return { yMin: min - pad, yMax: max + pad };
  }, [chartData, wellsWithTarget]);

  if (!wellsWithTarget.some((w) => {
    const r = w.reactions.find((rx) => rx.targetName === activeTarget);
    return r?.deltaRn?.length || r?.rn?.length;
  })) {
    return (
      <div className="amp-chart-empty">
        <p>Amplification curves require an .eds file with Rn/ΔRn data.</p>
        <p className="amp-chart-empty__hint">
          Excel exports include Cq values only — use the Results tab for those.
        </p>
      </div>
    );
  }

  return (
    <div className="amp-chart-wrap">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={chartData} margin={MARGIN}>
          <CartesianGrid
            strokeDasharray="2 2"
            stroke="rgba(255,255,255,0.04)"
          />
          <XAxis
            dataKey="cycle"
            label={{
              value: 'Cycle',
              position: 'insideBottom',
              offset: -10,
              fill: '#888',
            }}
            tick={{
              fill: '#888',
              fontSize: 11,
              fontFamily: 'JetBrains Mono',
            }}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{
              fill: '#888',
              fontSize: 11,
              fontFamily: 'JetBrains Mono',
            }}
            label={{
              value: displayMode,
              angle: -90,
              position: 'insideLeft',
              fill: '#888',
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              background: '#1C1F26',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              fontSize: 11,
            }}
            labelFormatter={(cycle) => `Cycle ${cycle}`}
          />
          {wellsWithTarget.map((well) => {
            const omitKey = `${well.index}-${activeTarget}`;
            const highlighted = chartHighlightedWells.has(well.index);
            return (
              <Line
                key={well.index}
                type="monotone"
                dataKey={`well_${well.index}`}
                dot={false}
                strokeWidth={highlighted ? 2.5 : 1}
                stroke={sampleColors[well.sampleName] || '#555'}
                opacity={omittedWells.has(omitKey) ? 0.2 : 1}
                activeDot={{ r: 3 }}
                connectNulls
              />
            );
          })}
          <ReferenceLine
            y={threshold ?? 0.2}
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="6 3"
            ifOverflow="extendDomain"
          />
        </LineChart>
      </ResponsiveContainer>
      <ThresholdDragOverlay
        yMin={yMin}
        yMax={yMax}
        threshold={threshold ?? 0.2}
        onChange={onThresholdChange}
        height={CHART_HEIGHT}
        marginTop={MARGIN.top}
        marginBottom={MARGIN.bottom}
      />
    </div>
  );
}
