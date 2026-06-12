import { useMemo } from 'react';
import { buildStandardCurveData } from '../../utils/standardCurve';
import SCChart from './SCChart';

export default function StandardCurveTab({
  experiment,
  liveCtLookup,
}) {
  const curveData = useMemo(
    () =>
      buildStandardCurveData(
        experiment?.standardCurveResult,
        experiment?.wells ?? [],
        liveCtLookup
      ),
    [experiment, liveCtLookup]
  );

  if (!curveData) {
    return (
      <div className="tab-panel tab-placeholder">
        <p>No standard curve data in this experiment.</p>
        <p className="placeholder-hint">
          Standard curve analysis is available for standard curve runs with
          dilution series in sample names (e.g. 1:10, 1:100).
        </p>
      </div>
    );
  }

  const { points, wellRows, regression, targetName } = curveData;

  return (
    <div className="tab-panel standard-curve-tab">
      <div className="sc-layout">
        <div className="sc-chart-panel">
          <SCChart points={points} regression={regression} />
        </div>
        <div className="sc-stats-panel">
          <h3 className="sc-stats-title">Curve Statistics</h3>
          <dl className="sc-stats-list">
            <dt>Target</dt>
            <dd>{targetName}</dd>
            <dt>Slope</dt>
            <dd className="mono">{regression.slope.toFixed(3)}</dd>
            <dt>Intercept</dt>
            <dd className="mono">{regression.intercept.toFixed(2)}</dd>
            <dt>R²</dt>
            <dd className="mono">{regression.r2.toFixed(4)}</dd>
            <dt>Efficiency</dt>
            <dd className="mono">{regression.efficiency.toFixed(1)}%</dd>
          </dl>

          <h4 className="sc-table-title">Standard Wells</h4>
          <table className="sc-wells-table">
            <thead>
              <tr>
                <th>Well</th>
                <th>Dilution</th>
                <th>Ct</th>
              </tr>
            </thead>
            <tbody>
              {wellRows.map((row, i) => (
                <tr key={i}>
                  <td className="mono">{row.position}</td>
                  <td>{row.dilution}</td>
                  <td className="mono">{row.ct.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
