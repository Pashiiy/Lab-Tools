function findAnnealingTemp(runMethod) {
  if (!runMethod?.stages) return null;
  for (const stage of runMethod.stages) {
    const steps = stage.steps || stage.temperatureSteps || [];
    for (const step of steps) {
      if (step.collectionProfile || step.collectData) {
        return step.temperature ?? step.temp ?? null;
      }
    }
  }
  return null;
}

function countPcrCycles(runMethod) {
  if (!runMethod?.stages) return null;
  for (const stage of runMethod.stages) {
    const type = String(stage.stageType || stage.type || '').toUpperCase();
    if (type.includes('PCR') || type.includes('CYCLING')) {
      return stage.repeatCount ?? stage.cycles ?? stage.repeats ?? null;
    }
  }
  return null;
}

export default function MethodDetailsTable({ runMethod }) {
  if (!runMethod) {
    return null;
  }

  const rows = [
    {
      label: 'Sample Volume',
      value: runMethod.sampleVolume != null
        ? `${runMethod.sampleVolume} µL`
        : runMethod.volume != null
          ? `${runMethod.volume} µL`
          : '—',
    },
    {
      label: 'Cover Temperature',
      value: runMethod.coverTemperature != null
        ? `${runMethod.coverTemperature}°C`
        : '—',
    },
    {
      label: 'Cover Heater',
      value:
        runMethod.coverHeaterEnabled != null
          ? runMethod.coverHeaterEnabled
            ? 'Enabled'
            : 'Disabled'
          : runMethod.coverHeater != null
            ? runMethod.coverHeater
              ? 'Enabled'
              : 'Disabled'
            : '—',
    },
    {
      label: 'Run Mode',
      value: runMethod.runMode || runMethod.mode || 'Standard',
    },
    {
      label: 'PCR Cycles',
      value: countPcrCycles(runMethod) ?? '—',
    },
    {
      label: 'Annealing Temperature',
      value: (() => {
        const t = findAnnealingTemp(runMethod);
        return t != null ? `${t}°C` : '—';
      })(),
    },
    {
      label: 'Total Run Stages',
      value: (runMethod.stages || runMethod.thermalCyclingStages || []).length,
    },
  ];

  return (
    <table className="method-details">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th>{row.label}</th>
            <td className="mono">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
