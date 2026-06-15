import EmptyState from '../EmptyState';
import { formatHoldDuration, getTotalCycles } from '../../utils/experimentStats';

export default function MethodSection({ method }) {
  if (!method?.stages?.length) {
    return (
      <section className="qi-card">
        <h3 className="qi-section-title">Method</h3>
        <EmptyState
          icon="🌡"
          message={
            method
              ? 'No protocol stages found in this file.'
              : "Method details aren't available for Excel imports."
          }
        />
      </section>
    );
  }

  const totalCycles = getTotalCycles(method);

  return (
    <section className="qi-card">
      <h3 className="qi-section-title">Method</h3>
      <div className="qi-protocol-diagram">
        {method.stages.map((stage, si) => (
          <div key={si} className="qi-protocol-stage">
            <div className="qi-protocol-stage__label">
              {String(stage.type || 'STAGE').toUpperCase()} ({stage.repeatCount}×)
            </div>
            <div className="qi-protocol-stage__steps">
              {(stage.steps || []).map((step, i) => (
                <div key={i} className="qi-protocol-step">
                  <span className="qi-protocol-step__temp">
                    {step.temperature != null ? `${step.temperature}°C` : '—'}
                  </span>
                  <span className="qi-protocol-step__dur">
                    {formatHoldDuration(step.duration)}
                  </span>
                  {step.collection && (
                    <span className="qi-protocol-step__collect" title="Data collection">
                      ●
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="qi-protocol-legend">● = data collection point</p>
      <table className="qi-details-table">
        <tbody>
          <tr>
            <th>Sample volume</th>
            <td className="qi-mono">{method.sampleVolume ?? '—'} µL</td>
          </tr>
          <tr>
            <th>Cover temperature</th>
            <td className="qi-mono">
              {method.coverTemperature != null ? `${method.coverTemperature}°C` : '—'}
            </td>
          </tr>
          <tr>
            <th>Collection cycles (est.)</th>
            <td className="qi-mono">{totalCycles ?? '—'}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
