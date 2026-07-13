import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ErrorBar,
  LabelList,
} from 'recharts';
import { getChartTheme, chartTooltipStyle } from './chartTheme';

/**
 * Reusable comparison bar chart.
 * data: [{ name, value, error? }]
 */
export default function ComparisonBarChart({
  data,
  valueKey = 'value',
  nameKey = 'name',
  errorKey = 'error',
  color,
  height = 280,
  showLabels = true,
}) {
  const theme = useMemo(() => getChartTheme(), []);
  const fill = color || theme.accent;
  const hasError = data?.some((d) => d[errorKey] != null && Number(d[errorKey]) > 0);

  if (!data?.length) {
    return <p className="lt-viz-empty">No data to chart yet.</p>;
  }

  return (
    <div className="lt-viz-chart" style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
          <XAxis
            dataKey={nameKey}
            tick={{ fill: theme.tick, fontSize: 11 }}
            interval={0}
            angle={data.length > 6 ? -30 : 0}
            textAnchor={data.length > 6 ? 'end' : 'middle'}
            height={data.length > 6 ? 60 : 30}
          />
          <YAxis tick={{ fill: theme.tick, fontSize: 11 }} allowDecimals={false} />
          <Tooltip cursor={{ fill: theme.cursor }} contentStyle={chartTooltipStyle(theme)} />
          <Bar dataKey={valueKey} fill={fill} radius={[3, 3, 0, 0]}>
            {showLabels && (
              <LabelList
                dataKey={valueKey}
                position="top"
                style={{ fill: theme.text, fontSize: 10, fontFamily: 'DM Mono' }}
              />
            )}
            {hasError && <ErrorBar dataKey={errorKey} width={4} stroke={theme.axis} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
