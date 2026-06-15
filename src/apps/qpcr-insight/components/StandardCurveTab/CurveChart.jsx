import { Fragment, useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildRegressionLine } from '../../utils/standardCurve';

export default function CurveChart({ curves, targetColors }) {
  const chartCurves = useMemo(() => {
    return curves.map((curve) => {
      const label =
        curve.seriesLabel === 'combined'
          ? curve.target
          : `${curve.target} (${curve.seriesLabel})`;
      return {
        id: `${curve.target}||${curve.seriesLabel}`,
        label,
        target: curve.target,
        seriesLabel: curve.seriesLabel,
        points: curve.points,
        regressionLine: buildRegressionLine(curve.points, curve.slope, curve.intercept),
        color: targetColors[curve.target] || 'var(--qi-accent)',
      };
    });
  }, [curves, targetColors]);

  if (!chartCurves.length) {
    return <p className="qi-text-muted">No curves to display for the current filters.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
        <CartesianGrid strokeDasharray="2 2" stroke="var(--qi-border)" />
        <XAxis
          type="number"
          dataKey="logQuantity"
          domain={['auto', 'auto']}
          label={{
            value: 'log₁₀(Relative Quantity)',
            position: 'insideBottom',
            offset: -10,
            fill: 'var(--qi-text-muted)',
          }}
          tick={{ fill: 'var(--qi-text-muted)', fontFamily: 'var(--qi-font-mono)', fontSize: 11 }}
        />
        <YAxis
          type="number"
          dataKey="meanCq"
          label={{
            value: 'Cq',
            angle: -90,
            position: 'insideLeft',
            fill: 'var(--qi-text-muted)',
          }}
          tick={{ fill: 'var(--qi-text-muted)', fontFamily: 'var(--qi-font-mono)', fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--qi-panel-raised)',
            border: '1px solid var(--qi-border)',
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value, name) => [value?.toFixed?.(3) ?? value, name]}
        />
        <Legend />

        {chartCurves.map((curve) => (
          <Fragment key={curve.id}>
            <Scatter name={curve.label} data={curve.points} fill={curve.color} />
            <Line
              data={curve.regressionLine}
              dataKey="meanCq"
              stroke={curve.color}
              strokeWidth={1.5}
              strokeDasharray={curve.seriesLabel !== 'combined' ? '4 2' : undefined}
              dot={false}
              legendType="none"
            />
          </Fragment>
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
