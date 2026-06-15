import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import EmptyState from '../EmptyState';

export default function AmpCurvesSection({
  ampCurves,
  replicates,
  uniqueTargets,
  sampleColors,
}) {
  const [selectedTarget, setSelectedTarget] = useState(uniqueTargets[0] || '');
  const [displayMode, setDisplayMode] = useState('deltaRn');

  const chartData = useMemo(() => {
    if (!ampCurves || !selectedTarget) return { data: [], lineKeys: [] };

    const replicateByKey = {};
    replicates.forEach((r) => {
      if (r.targetName === selectedTarget) {
        const wellKey = r.well ?? r.id;
        replicateByKey[`${wellKey}-${r.targetName}`] = r;
        if (r.well == null) {
          replicateByKey[`${r.id}-${r.targetName}`] = r;
        }
      }
    });

    const lines = Object.entries(ampCurves.curves).filter(([key]) => {
      const targetPart = key.split('-').slice(1).join('-');
      return targetPart === selectedTarget;
    });

    if (!lines.length) return { data: [], lineKeys: [] };

    const cycleCount = ampCurves.cycleCount;
    const data = Array.from({ length: cycleCount }, (_, cycleIdx) => {
      const point = { cycle: cycleIdx + 1 };
      lines.forEach(([key, curve]) => {
        const values = displayMode === 'deltaRn' ? curve.deltaRn : curve.rn;
        const rep = replicateByKey[key];
        const label = rep
          ? `${rep.sampleName || 'Sample'} (${rep.well || key.split('-')[0]})`
          : key;
        point[label] = values[cycleIdx] ?? null;
      });
      return point;
    });

    return { data, lineKeys: Object.keys(data[0] || {}).filter((k) => k !== 'cycle') };
  }, [ampCurves, selectedTarget, displayMode, replicates]);

  if (!ampCurves) {
    return (
      <section className="qi-card">
        <h3 className="qi-section-title">Amplification Curves</h3>
        <EmptyState
          icon="⌇"
          message="Amplification curves aren't available for this file. They're included in .eds files and Excel exports that contain an 'Amplification Data' sheet."
        />
      </section>
    );
  }

  const lineKeys = chartData.lineKeys || [];
  const data = chartData.data || [];

  return (
    <section className="qi-card qi-amp-card">
      <div className="qi-section-header">
        <h3 className="qi-section-title">Amplification Curves</h3>
        <div className="qi-pill-toggle">
          <button
            type="button"
            className={displayMode === 'deltaRn' ? 'qi-pill-toggle__btn--active' : ''}
            onClick={() => setDisplayMode('deltaRn')}
          >
            ΔRn
          </button>
          <button
            type="button"
            className={displayMode === 'rn' ? 'qi-pill-toggle__btn--active' : ''}
            onClick={() => setDisplayMode('rn')}
          >
            Rn
          </button>
        </div>
      </div>

      <div className="qi-target-pills">
        {uniqueTargets.map((target) => (
          <button
            key={target}
            type="button"
            className={`qi-target-pill${selectedTarget === target ? ' qi-target-pill--active' : ''}`}
            onClick={() => setSelectedTarget(target)}
          >
            {target}
          </button>
        ))}
      </div>

      {data.length > 0 ? (
        <div className="qi-amp-chart">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="cycle"
                tick={{ fill: '#8B949E', fontSize: 11 }}
                label={{ value: 'Cycle', position: 'insideBottom', offset: -4, fill: '#8B949E' }}
              />
              <YAxis tick={{ fill: '#8B949E', fontSize: 11 }} width={48} />
              <Tooltip
                contentStyle={{
                  background: '#161B22',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {lineKeys.map((key, i) => {
                const sampleName = key.split(' (')[0];
                const color = sampleColors[sampleName] || `hsl(${(i * 47) % 360}, 70%, 60%)`;
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    dot={false}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState
          icon="⌇"
          message={`No amplification curves found for target "${selectedTarget}".`}
        />
      )}
    </section>
  );
}
