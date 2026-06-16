import { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { computeTargetRatio, DILUTION_STROKES } from '../../utils/parseTimeCourse';
import { getActiveDotProps, getDotProps, getLineType } from './chartOptions';

const DILUTION_COLORS = ['#2DD4BF', '#60A5FA', '#FB923C', '#A78BFA', '#34D399', '#F472B6'];

export default function RatioChart({
  normalizedData,
  timepoints,
  selectedDilutions,
  hasDilutionData = true,
  targets,
  ratioNumerator,
  ratioDenominator,
  onRatioNumeratorChange,
  onRatioDenominatorChange,
  yAxisScale,
  onYAxisScaleChange,
  timeUnit,
  options,
}) {
  const lineType = getLineType(options.lineStyle);
  const dot = getDotProps(options.showDataPoints);
  const activeDot = getActiveDotProps(options.showDataPoints);
  const log2 = yAxisScale === 'log2';

  const ratioLabel = `${ratioNumerator} ÷ ${ratioDenominator}`;

  const { chartData, lineKeys } = useMemo(() => {
    // A dilution-free experiment has a single null "dilution" — label that series
    // with the ratio name itself instead of a meaningless "1:null".
    const seriesLabel = (dilution) => (dilution === null ? ratioLabel : `1:${dilution}`);
    const ratios = computeTargetRatio(normalizedData, ratioNumerator, ratioDenominator);
    const data = timepoints.map((tp) => {
      const entry = { timepoint: tp, label: `${tp}${timeUnit}` };
      selectedDilutions.forEach((dilution) => {
        const key = seriesLabel(dilution);
        const row = ratios.find((r) => r.timepoint === tp && r.dilution === dilution);
        let value = row?.ratio ?? null;
        if (value != null && log2) {
          value = value > 0 ? parseFloat(Math.log2(value).toFixed(4)) : null;
        }
        entry[key] = value;
      });
      return entry;
    });

    const keys = selectedDilutions.map((dilution, i) => ({
      key: seriesLabel(dilution),
      dilution,
      color: DILUTION_COLORS[i % DILUTION_COLORS.length],
      strokeDasharray: hasDilutionData ? DILUTION_STROKES[dilution] : undefined,
    }));

    return { chartData: data, lineKeys: keys };
  }, [
    normalizedData,
    timepoints,
    selectedDilutions,
    hasDilutionData,
    ratioNumerator,
    ratioDenominator,
    ratioLabel,
    log2,
    timeUnit,
  ]);

  return (
    <div className="qi-tc-chart">
      <div className="qi-tc-ratio-config">
        <label className="qi-tc-ratio-config__field">
          <span>Numerator</span>
          <select value={ratioNumerator} onChange={(e) => onRatioNumeratorChange(e.target.value)}>
            {targets.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <span className="qi-tc-ratio-config__divider">÷</span>
        <label className="qi-tc-ratio-config__field">
          <span>Denominator</span>
          <select
            value={ratioDenominator}
            onChange={(e) => onRatioDenominatorChange(e.target.value)}
          >
            {targets.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="qi-tc-ratio-config__field">
          <span>Y-axis</span>
          <select value={yAxisScale} onChange={(e) => onYAxisScaleChange(e.target.value)}>
            <option value="linear">Linear</option>
            <option value="log2">Log2</option>
          </select>
        </label>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 24, left: 12, bottom: 8 }}>
          <CartesianGrid stroke="var(--qi-border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: 'var(--qi-text-muted)', fontSize: 11 }} />
          <YAxis
            tick={{ fill: 'var(--qi-text-muted)', fontSize: 11 }}
            width={48}
            label={{
              value: log2 ? 'log₂ Ratio' : 'Ratio',
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
            y={log2 ? 0 : 1}
            stroke="rgba(45,212,191,0.4)"
            strokeDasharray="6 3"
            label={{
              value: 'Equal copy number',
              fill: 'rgba(45,212,191,0.6)',
              fontSize: 10,
              position: 'insideTopRight',
            }}
          />
          {lineKeys.map(({ key, color, strokeDasharray }) => (
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
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="qi-ddct-chart-caption">
        {ratioLabel} over time — ratio &lt; 1: numerator depleted; &gt; 1: enriched
      </p>
    </div>
  );
}
