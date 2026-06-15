import { useEffect, useMemo, useState } from 'react';
import { assignColors } from '../../constants/theme';
import { detectStandardCurveSeries } from '../../utils/parseDilutions';
import { prepareCurveGroups } from '../../utils/standardCurve';
import CurveChart from './CurveChart';
import EfficiencyTable from './EfficiencyTable';
import PointsTable from './PointsTable';

const SC_TARGET_PALETTE = ['#2DD4BF', '#60A5FA', '#FB923C', '#A78BFA', '#34D399', '#F472B6'];

export default function StandardCurveTab({ averagedData }) {
  const [selectedSeries, setSelectedSeries] = useState('all');
  const [combineSeries, setCombineSeries] = useState(false);
  const [selectedCurveId, setSelectedCurveId] = useState(null);

  const detectedSeries = useMemo(
    () => detectStandardCurveSeries(averagedData),
    [averagedData]
  );

  const seriesLabels = useMemo(
    () => [...new Set(detectedSeries.map((s) => s.seriesLabel))].sort(),
    [detectedSeries]
  );

  const curves = useMemo(
    () => prepareCurveGroups(detectedSeries, { selectedSeries, combineSeries }),
    [detectedSeries, selectedSeries, combineSeries]
  );

  const targetColors = useMemo(
    () => assignColors([...new Set(curves.map((c) => c.target))], SC_TARGET_PALETTE),
    [curves]
  );

  useEffect(() => {
    if (!curves.length) {
      setSelectedCurveId(null);
      return;
    }
    const stillValid = curves.some((c) => `${c.target}||${c.seriesLabel}` === selectedCurveId);
    if (!stillValid) {
      const first = curves[0];
      setSelectedCurveId(`${first.target}||${first.seriesLabel}`);
    }
  }, [curves, selectedCurveId]);

  const selectedCurve = curves.find((c) => `${c.target}||${c.seriesLabel}` === selectedCurveId);

  return (
    <div className="qi-data-tab qi-sc-tab">
      <div className="qi-sc-toolbar">
        <label className="qi-sc-toolbar__field">
          <span>Series</span>
          <select value={selectedSeries} onChange={(e) => setSelectedSeries(e.target.value)}>
            <option value="all">All series</option>
            {seriesLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="qi-sc-toolbar__checkbox">
          <input
            type="checkbox"
            checked={combineSeries}
            onChange={(e) => setCombineSeries(e.target.checked)}
          />
          Combine series
        </label>
      </div>

      <div className="qi-sc-layout">
        <section className="qi-card qi-sc-chart-card">
          <h2 className="qi-section-title">Standard Curve</h2>
          <CurveChart curves={curves} targetColors={targetColors} />
        </section>

        <section className="qi-card qi-sc-efficiency-card">
          <h2 className="qi-section-title">Efficiency</h2>
          <EfficiencyTable
            curves={curves}
            selectedCurveId={selectedCurveId}
            onSelectCurve={setSelectedCurveId}
          />
        </section>
      </div>

      <PointsTable curve={selectedCurve} />
    </div>
  );
}
