function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

function getStageLabel(stage) {
  const type = stage.stageType || stage.type || stage.name || 'STAGE';
  const repeats = stage.repeatCount ?? stage.cycles ?? stage.repeats ?? 1;
  return `${String(type).toUpperCase()} (${repeats}×)`;
}

function getSteps(stage) {
  if (stage.steps?.length) return stage.steps;
  if (stage.temperatureSteps?.length) return stage.temperatureSteps;
  return [];
}

export default function ProtocolDiagram({ runMethod }) {
  if (!runMethod) {
    return (
      <p className="method-empty">
        Protocol data not available for this file type.
      </p>
    );
  }

  const stages = runMethod.stages || runMethod.thermalCyclingStages || [];

  if (!stages.length) {
    return <p className="method-empty">No protocol stages found.</p>;
  }

  return (
    <div className="protocol-diagram">
      {stages.map((stage, si) => (
        <div key={si} className="protocol-stage">
          <div className="protocol-stage__label">{getStageLabel(stage)}</div>
          <div className="protocol-stage__steps">
            {getSteps(stage).map((step, i) => {
              const temp =
                step.temperature ?? step.temp ?? step.annealingTemperature;
              const duration =
                step.duration ?? step.holdTime ?? step.time ?? step.seconds;
              const collects = step.collectionProfile || step.collectData;

              return (
                <div key={i} className="protocol-step">
                  <span className="protocol-step__temp">
                    {temp != null ? `${temp}°C` : '—'}
                  </span>
                  <span className="protocol-step__dur">
                    {formatDuration(duration)}
                  </span>
                  {step.rampRate != null && (
                    <span className="protocol-step__ramp">
                      {step.rampRate}°C/s
                    </span>
                  )}
                  {collects && (
                    <span className="protocol-step__collect" title="Data collection">
                      ●
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="protocol-legend">● = data collection point</p>
    </div>
  );
}
