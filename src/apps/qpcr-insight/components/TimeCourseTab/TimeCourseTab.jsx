import { useEffect, useMemo, useState } from 'react';
import { assignColors, TARGET_PALETTE } from '../../constants/theme';
import { normalizeToT0 } from '../../utils/parseTimeCourse';
import TimeCourseChart from './TimeCourseChart';
import AbsoluteRQChart from './AbsoluteRQChart';
import RatioChart from './RatioChart';
import ChartOptionsDrawer from './ChartOptionsDrawer';
import SummaryTable from './SummaryTable';
import EmptyState from '../EmptyState';
import { loadChartOptions, saveChartOptions } from './chartOptions';

const CHART_VIEWS = [
  { id: 'percent', label: '% of T0' },
  { id: 'fold', label: 'Fold Change' },
  { id: 'absolute', label: 'Absolute RQ' },
  { id: 'ratio', label: 'Ratio' },
];

export default function TimeCourseTab({ timeCourseData, referenceGene }) {
  const { timepoints, dilutions, targets, data } = timeCourseData;

  const [t0Timepoint, setT0Timepoint] = useState(timepoints[0]);
  const [timeUnit, setTimeUnit] = useState('h');
  const [selectedDilutions, setSelectedDilutions] = useState(() => new Set(dilutions));
  const [selectedTargets, setSelectedTargets] = useState(() => new Set(targets));
  const [chartView, setChartView] = useState('percent');
  const [chartOptions, setChartOptions] = useState(loadChartOptions);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [ratioNumerator, setRatioNumerator] = useState(targets[0] || '');
  const [ratioDenominator, setRatioDenominator] = useState(targets[1] || targets[0] || '');

  useEffect(() => {
    setT0Timepoint(timepoints[0]);
    setSelectedDilutions(new Set(dilutions));
    setSelectedTargets(new Set(targets));
    if (targets.length >= 2) {
      setRatioNumerator(targets[0]);
      setRatioDenominator(targets[1]);
    } else if (targets.length === 1) {
      setRatioNumerator(targets[0]);
      setRatioDenominator(targets[0]);
    }
  }, [timeCourseData, timepoints, dilutions, targets]);

  useEffect(() => {
    saveChartOptions(chartOptions);
  }, [chartOptions]);

  const normalizedData = useMemo(
    () => normalizeToT0(data, t0Timepoint),
    [data, t0Timepoint]
  );

  const targetColors = useMemo(() => assignColors(targets, TARGET_PALETTE), [targets]);

  const dilutionList = useMemo(() => [...selectedDilutions].sort((a, b) => a - b), [selectedDilutions]);
  const targetList = useMemo(() => [...selectedTargets].sort(), [selectedTargets]);

  const toggleDilution = (d) => {
    setSelectedDilutions((prev) => {
      const next = new Set(prev);
      if (next.has(d)) {
        if (next.size > 1) next.delete(d);
      } else {
        next.add(d);
      }
      return next;
    });
  };

  const toggleTarget = (t) => {
    setSelectedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        if (next.size > 1) next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  };

  const viewOptions = chartOptions[chartView];

  const showRatioRows =
    chartView === 'ratio' ||
    (selectedTargets.has(ratioNumerator) && selectedTargets.has(ratioDenominator));

  if (!referenceGene) {
    return (
      <EmptyState
        icon="⏱"
        message="Select a reference gene in the ΔΔCt tab first to enable time course analysis."
      />
    );
  }

  if (dilutionList.length === 0 || targetList.length === 0) {
    return (
      <EmptyState
        icon="⏱"
        message="Select at least one dilution and one target to display the time course."
      />
    );
  }

  return (
    <div className="qi-data-tab qi-tc-tab">
      <section className="qi-card qi-tc-config">
        <div className="qi-tc-config__row">
          <label className="qi-tc-config__field">
            <span>T0</span>
            <select value={t0Timepoint} onChange={(e) => setT0Timepoint(parseFloat(e.target.value))}>
              {timepoints.map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                  {timeUnit}
                </option>
              ))}
            </select>
          </label>

          <label className="qi-tc-config__field">
            <span>Unit</span>
            <input
              type="text"
              value={timeUnit}
              onChange={(e) => setTimeUnit(e.target.value)}
              className="qi-tc-config__unit-input"
              placeholder="h"
            />
          </label>

          <div className="qi-tc-config__pills-group">
            <span className="qi-tc-config__pills-label">Dilution</span>
            <div className="qi-tc-config__pills">
              {dilutions.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`qi-tc-pill${selectedDilutions.has(d) ? ' qi-tc-pill--active' : ''}`}
                  onClick={() => toggleDilution(d)}
                >
                  1:{d}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="qi-tc-config__options-btn"
            onClick={() => setOptionsOpen((v) => !v)}
            aria-expanded={optionsOpen}
          >
            ⚙ Chart Options
          </button>
        </div>

        <div className="qi-tc-config__targets">
          <span className="qi-tc-config__pills-label">Targets</span>
          <div className="qi-tc-config__checks">
            {targets.map((t) => (
              <label key={t} className="qi-tc-config__check">
                <input
                  type="checkbox"
                  checked={selectedTargets.has(t)}
                  onChange={() => toggleTarget(t)}
                />
                {t}
              </label>
            ))}
          </div>
        </div>
      </section>

      <div className="qi-tc-view-toggle">
        {CHART_VIEWS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={chartView === id ? 'qi-tc-view-toggle__btn--active' : ''}
            onClick={() => setChartView(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="qi-card qi-tc-chart-card">
        {chartView === 'percent' && (
          <TimeCourseChart
            mode="percent"
            normalizedData={normalizedData}
            timepoints={timepoints}
            selectedTargets={targetList}
            selectedDilutions={dilutionList}
            targetColors={targetColors}
            timeUnit={timeUnit}
            options={viewOptions}
          />
        )}
        {chartView === 'fold' && (
          <TimeCourseChart
            mode="fold"
            normalizedData={normalizedData}
            timepoints={timepoints}
            selectedTargets={targetList}
            selectedDilutions={dilutionList}
            targetColors={targetColors}
            timeUnit={timeUnit}
            options={viewOptions}
          />
        )}
        {chartView === 'absolute' && (
          <AbsoluteRQChart
            normalizedData={normalizedData}
            timepoints={timepoints}
            selectedTargets={targetList}
            selectedDilutions={dilutionList}
            targetColors={targetColors}
            timeUnit={timeUnit}
            options={viewOptions}
          />
        )}
        {chartView === 'ratio' && (
          <RatioChart
            normalizedData={normalizedData}
            timepoints={timepoints}
            selectedDilutions={dilutionList}
            targets={targets}
            ratioNumerator={ratioNumerator}
            ratioDenominator={ratioDenominator}
            onRatioNumeratorChange={setRatioNumerator}
            onRatioDenominatorChange={setRatioDenominator}
            yAxisScale={viewOptions.yAxisScale}
            onYAxisScaleChange={(scale) =>
              setChartOptions((prev) => ({
                ...prev,
                ratio: { ...prev.ratio, yAxisScale: scale },
              }))
            }
            timeUnit={timeUnit}
            options={viewOptions}
          />
        )}
      </section>

      <ChartOptionsDrawer
        open={optionsOpen}
        options={chartOptions}
        chartView={chartView}
        onChange={setChartOptions}
      />

      <SummaryTable
        normalizedData={normalizedData}
        selectedTargets={targetList}
        selectedDilutions={dilutionList}
        t0Timepoint={t0Timepoint}
        timepoints={timepoints}
        chartView={chartView}
        ratioNumerator={ratioNumerator}
        ratioDenominator={ratioDenominator}
        showRatioRows={showRatioRows}
      />
    </div>
  );
}
