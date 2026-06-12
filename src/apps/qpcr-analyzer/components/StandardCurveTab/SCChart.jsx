import { useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  Line,
  ComposedChart,
} from 'recharts';

export default function SCChart({ points, regression }) {
  const lineData = useMemo(() => {
    if (!regression || points.length < 2) return [];
    const xs = points.map((p) => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const pad = (maxX - minX) * 0.1 || 0.5;
    return [
      {
        x: minX - pad,
        y: regression.slope * (minX - pad) + regression.intercept,
      },
      {
        x: maxX + pad,
        y: regression.slope * (maxX + pad) + regression.intercept,
      },
    ];
  }, [points, regression]);

  const scatterData = points.map((p) => ({
    x: p.x,
    y: p.y,
    label: p.sampleName,
  }));

  const combined = [...scatterData, ...lineData];

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={combined} margin={{ top: 16, right: 24, left: 16, bottom: 32 }}>
        <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          type="number"
          dataKey="x"
          domain={['auto', 'auto']}
          tick={{ fill: '#888', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          label={{
            value: 'log₁₀(dilution)',
            position: 'insideBottom',
            offset: -12,
            fill: '#888',
            fontSize: 11,
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          tick={{ fill: '#888', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          label={{
            value: 'Ct',
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
        />
        <Scatter data={scatterData} fill="var(--accent)" />
        {lineData.length === 2 && (
          <Line
            data={lineData}
            type="linear"
            dataKey="y"
            dot={false}
            stroke="var(--warning)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
