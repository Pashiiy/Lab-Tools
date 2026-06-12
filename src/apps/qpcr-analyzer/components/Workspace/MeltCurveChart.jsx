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
} from 'recharts';
import { getMeltDisplayValues } from '../../utils/meltCurve';
import { getSeriesColor } from '../../utils/workspaceFilters';

const CHART_HEIGHT = 260;

export default function MeltCurveChart({
  visibleSeries,
  chartColorBy,
  sampleColors,
  targetColors,
  plateSelectedWells,
}) {
  const chartData = useMemo(() => {
    const maxLen = Math.max(
      ...visibleSeries.map((s) => s.reaction.meltCurve?.length ?? 0),
      0
    );
    if (maxLen === 0) return [];

    return Array.from({ length: maxLen }, (_, i) => {
      const entry = { idx: i };
      visibleSeries.forEach((s) => {
        const { values, temperatures } = getMeltDisplayValues(s.reaction);
        entry[`temp_${s.key}`] = temperatures[i] ?? null;
        entry[s.key] = values[i] ?? null;
      });
      return entry;
    });
  }, [visibleSeries]);

  if (!chartData.length) {
    return (
      <div className="ws-chart-empty ws-chart-empty--compact">
        <p>No melt curve data in this experiment.</p>
      </div>
    );
  }

  const xKey = visibleSeries[0]?.key;
  const useTempX = chartData.some((row) => row[`temp_${visibleSeries[0]?.key}`] != null);

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={chartData} margin={{ top: 12, right: 100, bottom: 24, left: 48 }}>
        <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey={useTempX ? `temp_${xKey}` : 'idx'}
          type="number"
          domain={['auto', 'auto']}
          label={{
            value: useTempX ? 'Temperature (°C)' : 'Melt Point',
            position: 'insideBottom',
            offset: -6,
            fill: '#888',
            fontSize: 10,
          }}
          tick={{ fill: '#888', fontSize: 10, fontFamily: 'JetBrains Mono' }}
        />
        <YAxis
          tick={{ fill: '#888', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          label={{
            value: 'Signal',
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
        />
        <Legend wrapperStyle={{ fontSize: 9 }} />
        {visibleSeries.map((s) => {
          const selected = plateSelectedWells.has(s.wellIndex);
          return (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={`${s.position} ${s.targetName}`}
              dot={false}
              strokeWidth={selected ? 2 : 1}
              stroke={getSeriesColor(s, chartColorBy, sampleColors, targetColors)}
              opacity={selected || plateSelectedWells.size === 0 ? 1 : 0.35}
              connectNulls
              isAnimationActive={false}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
