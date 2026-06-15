import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  combineDilutions,
  DILUTION_STROKES,
  lineLabel,
} from '../../utils/parseTimeCourse';
import { getActiveDotProps, getDotProps, getLineType } from './chartOptions';

export default function AbsoluteRQChart({
  normalizedData,
  timepoints,
  selectedTargets,
  selectedDilutions,
  targetColors,
  timeUnit,
  options,
}) {
  const lineType = getLineType(options.lineStyle);
  const dot = getDotProps(options.showDataPoints);
  const activeDot = getActiveDotProps(options.showDataPoints);

  const { chartData, lineKeys, combinedTargets } = useMemo(() => {
    if (options.combineDilutions) {
      const combined = combineDilutions(
        normalizedData,
        selectedDilutions,
        selectedTargets,
        'rq'
      );
      const tps = [...new Set(combined.map((c) => c.timepoint))].sort((a, b) => a - b);
      const data = tps.map((tp) => {
        const entry = { timepoint: tp, label: `${tp}${timeUnit}` };
        selectedTargets.forEach((target) => {
          const row = combined.find((c) => c.timepoint === tp && c.target === target);
          entry[`${target}_mean`] = row?.mean ?? null;
          entry[`${target}_bandBase`] = row?.bandLower ?? null;
          entry[`${target}_bandRange`] =
            row?.bandUpper != null && row?.bandLower != null
              ? row.bandUpper - row.bandLower
              : null;
        });
        return entry;
      });
      return { chartData: data, lineKeys: [], combinedTargets: selectedTargets };
    }

    const data = timepoints.map((tp) => {
      const entry = { timepoint: tp, label: `${tp}${timeUnit}` };
      selectedTargets.forEach((target) => {
        selectedDilutions.forEach((dilution) => {
          const key = lineLabel(target, dilution, options.dilutionLabels);
          const row = normalizedData.find(
            (d) => d.timepoint === tp && d.target === target && d.dilution === dilution
          );
          entry[key] = row?.rq ?? null;
          entry[`${key}_err`] = [row?.rqErrorMinus ?? 0, row?.rqErrorPlus ?? 0];
        });
      });
      return entry;
    });

    const keys = [];
    selectedTargets.forEach((target) => {
      selectedDilutions.forEach((dilution) => {
        keys.push({
          key: lineLabel(target, dilution, options.dilutionLabels),
          target,
          dilution,
          color: targetColors[target] || 'var(--qi-accent)',
          strokeDasharray: DILUTION_STROKES[dilution],
        });
      });
    });

    return { chartData: data, lineKeys: keys, combinedTargets: [] };
  }, [
    normalizedData,
    timepoints,
    selectedTargets,
    selectedDilutions,
    targetColors,
    options,
    timeUnit,
  ]);

  return (
    <div className="qi-tc-chart">
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 24, left: 12, bottom: 8 }}>
          <CartesianGrid stroke="var(--qi-border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: 'var(--qi-text-muted)', fontSize: 11 }} />
          <YAxis
            tick={{ fill: 'var(--qi-text-muted)', fontSize: 11 }}
            width={48}
            label={{
              value: 'RQ',
              angle: -90,
              position: 'insideLeft',
              fill: 'var(--qi-text-muted)',
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--qi-panel)',
              border: '1px solid var(--qi-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => (value != null ? Number(value).toFixed(4) : '—')}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {options.combineDilutions
            ? combinedTargets.map((target) => {
                const color = targetColors[target] || 'var(--qi-accent)';
                return (
                  <g key={target}>
                    <Area
                      type={lineType}
                      dataKey={`${target}_bandBase`}
                      stackId={`${target}_band`}
                      stroke="none"
                      fill="transparent"
                      legendType="none"
                      isAnimationActive={false}
                    />
                    <Area
                      type={lineType}
                      dataKey={`${target}_bandRange`}
                      stackId={`${target}_band`}
                      stroke="none"
                      fill={color}
                      fillOpacity={0.15}
                      legendType="none"
                      isAnimationActive={false}
                    />
                    <Line
                      type={lineType}
                      dataKey={`${target}_mean`}
                      name={target}
                      stroke={color}
                      strokeWidth={2}
                      dot={dot}
                      activeDot={activeDot}
                      isAnimationActive={false}
                    />
                  </g>
                );
              })
            : lineKeys.map(({ key, color, strokeDasharray }) => (
                <Line
                  key={key}
                  type={lineType}
                  dataKey={key}
                  name={key}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeDasharray={strokeDasharray}
                  dot={dot}
                  activeDot={activeDot}
                  isAnimationActive={false}
                >
                  {options.showErrorBands && (
                    <ErrorBar
                      dataKey={`${key}_err`}
                      width={4}
                      direction="y"
                      stroke={color}
                    />
                  )}
                </Line>
              ))}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="qi-ddct-chart-caption">
        Absolute RQ over time — uniform shifts may indicate loading differences
      </p>
    </div>
  );
}
