import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Legend,
  Line,
  ReferenceLine,
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

function buildSeparatedChartData({
  normalizedData,
  timepoints,
  selectedTargets,
  selectedDilutions,
  valueKey,
  errMinusKey,
  errPlusKey,
  showDilutionLabels,
  timeUnit,
  log2,
  isPercent,
}) {
  return timepoints.map((tp) => {
    const entry = { timepoint: tp, label: `${tp}${timeUnit}` };
    selectedTargets.forEach((target) => {
      selectedDilutions.forEach((dilution) => {
        const key = lineLabel(target, dilution, showDilutionLabels);
        const row = normalizedData.find(
          (d) => d.timepoint === tp && d.target === target && d.dilution === dilution
        );
        let value = row?.[valueKey] ?? null;
        if (value != null && log2) {
          const fold = isPercent ? value / 100 : value;
          value = fold > 0 ? parseFloat(Math.log2(fold).toFixed(4)) : null;
        }
        entry[key] = value;
        if (row && errMinusKey && errPlusKey) {
          let errMinus = row[errMinusKey] ?? 0;
          let errPlus = row[errPlusKey] ?? 0;
          if (log2 && row[valueKey] > 0) {
            const fold = isPercent ? row[valueKey] / 100 : row[valueKey];
            const logVal = Math.log2(fold);
            const foldUpper = isPercent
              ? (row[valueKey] + (row[errPlusKey] ?? 0)) / 100
              : row[valueKey] + (row[errPlusKey] ?? 0);
            const foldLower = isPercent
              ? Math.max((row[valueKey] - (row[errMinusKey] ?? 0)) / 100, 0.001)
              : Math.max(row[valueKey] - (row[errMinusKey] ?? 0), 0.001);
            const logUpper = Math.log2(foldUpper);
            const logLower = Math.log2(foldLower);
            errMinus = logVal - logLower;
            errPlus = logUpper - logVal;
          }
          entry[`${key}_err`] = [errMinus, errPlus];
        } else {
          entry[`${key}_err`] = [0, 0];
        }
      });
    });
    return entry;
  });
}

function buildCombinedChartData({
  normalizedData,
  selectedTargets,
  selectedDilutions,
  valueKey,
  timeUnit,
  log2,
  isPercent,
}) {
  const combined = combineDilutions(
    normalizedData,
    selectedDilutions,
    selectedTargets,
    valueKey
  );
  const timepoints = [...new Set(combined.map((c) => c.timepoint))].sort((a, b) => a - b);

  return timepoints.map((tp) => {
    const entry = { timepoint: tp, label: `${tp}${timeUnit}` };
    selectedTargets.forEach((target) => {
      const row = combined.find((c) => c.timepoint === tp && c.target === target);
      let mean = row?.mean ?? null;
      let bandLower = row?.bandLower ?? null;
      let bandUpper = row?.bandUpper ?? null;
      if (mean != null && log2) {
        const fold = isPercent ? mean / 100 : mean;
        mean = fold > 0 ? Math.log2(fold) : null;
        const foldLower = isPercent ? Math.max(bandLower / 100, 0.001) : Math.max(bandLower, 0.001);
        const foldUpper = isPercent ? bandUpper / 100 : bandUpper;
        bandLower = foldLower > 0 ? Math.log2(foldLower) : null;
        bandUpper = foldUpper > 0 ? Math.log2(foldUpper) : null;
      }
      entry[`${target}_mean`] = mean;
      entry[`${target}_bandBase`] = bandLower;
      entry[`${target}_bandRange`] =
        bandUpper != null && bandLower != null ? bandUpper - bandLower : null;
    });
    return entry;
  });
}

export default function TimeCourseChart({
  mode,
  normalizedData,
  timepoints,
  selectedTargets,
  selectedDilutions,
  targetColors,
  timeUnit,
  options,
}) {
  const isPercent = mode === 'percent';
  const valueKey = isPercent ? 'normalizedPercent' : 'foldVsT0';
  const errMinusKey = isPercent ? 'normErrMinus' : 'normErrMinus';
  const errPlusKey = isPercent ? 'normErrPlus' : 'normErrPlus';
  const log2 = options.yAxisScale === 'log2';
  const lineType = getLineType(options.lineStyle);
  const dot = getDotProps(options.showDataPoints);
  const activeDot = getActiveDotProps(options.showDataPoints);

  const refY = isPercent ? (log2 ? Math.log2(1) : 100) : log2 ? 0 : 1;
  const refLabel = isPercent ? 'T0 baseline' : 'No change (T0)';
  const yLabel = isPercent
    ? log2
      ? 'log₂ (% of T0)'
      : '% of T0'
    : log2
      ? 'log₂ Fold Change'
      : 'Fold Change vs T0';

  const { chartData, lineKeys, combinedTargets } = useMemo(() => {
    if (options.combineDilutions) {
      const data = buildCombinedChartData({
        normalizedData,
        selectedTargets,
        selectedDilutions,
        valueKey,
        timeUnit,
        log2,
        isPercent,
      });
      return { chartData: data, lineKeys: [], combinedTargets: selectedTargets };
    }

    const data = buildSeparatedChartData({
      normalizedData,
      timepoints,
      selectedTargets,
      selectedDilutions,
      valueKey,
      errMinusKey,
      errPlusKey,
      showDilutionLabels: options.dilutionLabels,
      timeUnit,
      log2,
      isPercent,
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
    valueKey,
    errMinusKey,
    errPlusKey,
    timeUnit,
    log2,
    isPercent,
  ]);

  return (
    <div className="qi-tc-chart">
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 24, left: 12, bottom: 8 }}>
          <CartesianGrid stroke="var(--qi-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--qi-text-muted)', fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: 'var(--qi-text-muted)', fontSize: 11 }}
            width={56}
            label={{
              value: yLabel,
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
            formatter={(value) => (value != null ? Number(value).toFixed(3) : '—')}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine
            y={refY}
            stroke="rgba(45,212,191,0.4)"
            strokeDasharray="6 3"
            label={{
              value: refLabel,
              fill: 'rgba(45,212,191,0.6)',
              fontSize: 10,
              position: 'insideTopRight',
            }}
          />

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
    </div>
  );
}
