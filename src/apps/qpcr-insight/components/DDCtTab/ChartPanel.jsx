import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ErrorBar,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { parseDilutionFromSampleName } from '../../utils/parseDilutions';
import Heatmap from './Heatmap';

const CHART_VIEWS = [
  { id: 'rq', label: 'RQ Chart' },
  { id: 'bar', label: 'Fold Change' },
  { id: 'heatmap', label: 'Heatmap' },
];

function buildRqChartData(ddCtResults, selectedTarget) {
  const rows = ddCtResults
    .filter((r) => r.target === selectedTarget)
    .map((r) => {
      const dilution = parseDilutionFromSampleName(r.sample);
      return {
        ...r,
        dilutionLabel: dilution ? `1:${dilution.dilutionDenominator}` : r.sample,
        dilutionOrder: dilution?.dilutionDenominator ?? 0,
        seriesLabel: dilution?.seriesLabel ?? r.sample,
      };
    });

  const dilutionLabels = [...new Set(rows.map((r) => r.dilutionLabel))].sort((a, b) => {
    const orderA = rows.find((r) => r.dilutionLabel === a)?.dilutionOrder ?? 0;
    const orderB = rows.find((r) => r.dilutionLabel === b)?.dilutionOrder ?? 0;
    return orderA - orderB;
  });

  const seriesLabels = [...new Set(rows.map((r) => r.seriesLabel))].sort();

  const chartData = dilutionLabels.map((dilutionLabel) => {
    const entry = { dilution: dilutionLabel };
    seriesLabels.forEach((series) => {
      const row = rows.find(
        (r) => r.dilutionLabel === dilutionLabel && r.seriesLabel === series
      );
      entry[series] = row?.rq ?? null;
      entry[`${series}_rq_err`] = [row?.rqErrorMinus ?? 0, row?.rqErrorPlus ?? 0];
      entry[`${series}_sample`] = row?.sample;
    });
    return entry;
  });

  return { chartData, seriesLabels, rows };
}

export default function ChartPanel({
  ddCtResults,
  sampleColors,
  calibratorSample,
  chartView,
  onChartViewChange,
}) {
  const hasCalibrator = !!calibratorSample;
  const targets = useMemo(
    () => [...new Set(ddCtResults.map((r) => r.target))].sort(),
    [ddCtResults]
  );
  const [selectedTarget, setSelectedTarget] = useState(targets[0] || '');

  const activeTarget = targets.includes(selectedTarget) ? selectedTarget : targets[0] || '';

  const { chartData: rqChartData, seriesLabels: rqSeriesLabels } = useMemo(
    () => buildRqChartData(ddCtResults, activeTarget),
    [ddCtResults, activeTarget]
  );

  const { fcChartData, fcSamples } = useMemo(() => {
    const sampleSet = new Set();
    const targetSet = new Set();
    ddCtResults.forEach((r) => {
      sampleSet.add(r.sample);
      targetSet.add(r.target);
    });
    const fcSamples = [...sampleSet].sort();
    const fcTargets = [...targetSet].sort();

    const fcChartData = fcTargets.map((target) => {
      const entry = { target };
      fcSamples.forEach((sample) => {
        const r = ddCtResults.find((x) => x.sample === sample && x.target === target);
        entry[sample] = r?.foldChange ?? null;
        entry[`${sample}_fc_err`] = [r?.errorMinus ?? 0, r?.errorPlus ?? 0];
      });
      return entry;
    });

    return { fcChartData, fcSamples };
  }, [ddCtResults]);

  const rqSeriesColors = useMemo(() => {
    const colors = {};
    rqSeriesLabels.forEach((series) => {
      const row = ddCtResults.find((r) => {
        const d = parseDilutionFromSampleName(r.sample);
        return (d?.seriesLabel ?? r.sample) === series;
      });
      colors[series] = (row && sampleColors[row.sample]) || 'var(--qi-accent)';
    });
    return colors;
  }, [rqSeriesLabels, ddCtResults, sampleColors]);

  return (
    <section className="qi-card qi-ddct-charts">
      <div className="qi-ddct-chart-toggle">
        {CHART_VIEWS.map(({ id, label }) => {
          const disabled = id === 'bar' && !hasCalibrator;
          return (
            <button
              key={id}
              type="button"
              className={chartView === id ? 'qi-ddct-chart-toggle__btn--active' : ''}
              onClick={() => !disabled && onChartViewChange(id)}
              disabled={disabled}
              title={
                disabled
                  ? 'Select a sample to compare against in the configuration panel above.'
                  : undefined
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {chartView === 'heatmap' ? (
        <Heatmap ddCtResults={ddCtResults} calibratorSample={calibratorSample} />
      ) : chartView === 'rq' ? (
        <div className="qi-ddct-bar-chart">
          {targets.length > 1 && (
            <div className="qi-ddct-target-pills">
              {targets.map((target) => (
                <button
                  key={target}
                  type="button"
                  className={
                    activeTarget === target ? 'qi-ddct-target-pills__btn--active' : ''
                  }
                  onClick={() => setSelectedTarget(target)}
                >
                  {target}
                </button>
              ))}
            </div>
          )}

          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={rqChartData} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--qi-border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="dilution"
                tick={{ fill: 'var(--qi-text-muted)', fontSize: 11 }}
              />
              <YAxis tick={{ fill: 'var(--qi-text-muted)', fontSize: 11 }} width={48} />
              <Tooltip
                contentStyle={{
                  background: 'var(--qi-panel)',
                  border: '1px solid var(--qi-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {rqSeriesLabels.map((series) => (
                <Bar
                  key={series}
                  dataKey={series}
                  name={series}
                  fill={rqSeriesColors[series] || 'var(--qi-accent)'}
                  isAnimationActive={false}
                >
                  <ErrorBar
                    dataKey={`${series}_rq_err`}
                    width={4}
                    direction="y"
                    stroke="var(--qi-text-muted)"
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
          <p className="qi-ddct-chart-caption">
            Relative quantity (2^−ΔCt) for {activeTarget} — grouped by dilution, bars = timepoint
          </p>
        </div>
      ) : (
        <div className="qi-ddct-bar-chart">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={fcChartData} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="var(--qi-border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="target"
                tick={{ fill: 'var(--qi-text-muted)', fontSize: 11 }}
              />
              <YAxis tick={{ fill: 'var(--qi-text-muted)', fontSize: 11 }} width={48} />
              <Tooltip
                contentStyle={{
                  background: 'var(--qi-panel)',
                  border: '1px solid var(--qi-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine
                y={1}
                stroke="var(--qi-text-muted)"
                strokeDasharray="4 4"
                label={{
                  value: 'No change (calibrator)',
                  position: 'insideTopRight',
                  fill: 'var(--qi-text-muted)',
                  fontSize: 10,
                }}
              />
              {fcSamples.map((sample) => (
                <Bar
                  key={sample}
                  dataKey={sample}
                  name={sample}
                  fill={sampleColors[sample] || 'var(--qi-accent)'}
                  isAnimationActive={false}
                >
                  <ErrorBar
                    dataKey={`${sample}_fc_err`}
                    width={4}
                    direction="y"
                    stroke="var(--qi-text-muted)"
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
          <p className="qi-ddct-chart-caption">
            Fold change (2^−ΔΔCt) relative to {calibratorSample}
          </p>
        </div>
      )}
    </section>
  );
}
