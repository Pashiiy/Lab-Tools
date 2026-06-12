import { useMemo } from 'react';
import { buildStandardCurveData } from '../../utils/standardCurve';
import SCChart from '../StandardCurveTab/SCChart';

export default function StandardCurvePanel({ experiment, liveCtLookup }) {
  const curveData = useMemo(
    () =>
      buildStandardCurveData(
        experiment?.standardCurveResult,
        experiment?.wells ?? [],
        liveCtLookup
      ),
    [experiment, liveCtLookup]
  );

  if (!curveData) return null;

  const { points, regression, targetName } = curveData;

  return (
    <div className="ws-sc-panel">
      <h4 className="ws-chart-title">Standard Curve — {targetName}</h4>
      <div className="ws-sc-layout">
        <SCChart points={points} regression={regression} />
        <dl className="ws-sc-stats mono">
          <dt>Slope</dt>
          <dd>{regression.slope.toFixed(3)}</dd>
          <dt>R²</dt>
          <dd>{regression.r2.toFixed(4)}</dd>
          <dt>Efficiency</dt>
          <dd>{regression.efficiency.toFixed(1)}%</dd>
        </dl>
      </div>
    </div>
  );
}
