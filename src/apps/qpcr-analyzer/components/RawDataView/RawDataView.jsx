import { useMemo, useState } from 'react';
import FilterBar from '../FilterBar';
import RawTable from './RawTable';

export default function RawDataView({ rawData, uniqueSamples, uniqueTargets, sampleColors, stats }) {
  const [selectedSample, setSelectedSample] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [hideNTC, setHideNTC] = useState(false);
  const [hideUndetermined, setHideUndetermined] = useState(false);
  const [hoveredSample, setHoveredSample] = useState(null);

  const filtered = useMemo(() => {
    let rows = [...rawData];

    if (selectedSample) {
      rows = rows.filter((r) => r.sampleName === selectedSample);
    }
    if (selectedTarget) {
      rows = rows.filter((r) => r.targetName === selectedTarget);
    }
    if (hideNTC) {
      rows = rows.filter((r) => !r.isNTC);
    }
    if (hideUndetermined) {
      rows = rows.filter((r) => !r.isUndetermined);
    }

    rows.sort((a, b) => {
      const sa = a.sampleName.localeCompare(b.sampleName);
      if (sa !== 0) return sa;
      const ta = a.targetName.localeCompare(b.targetName);
      if (ta !== 0) return ta;
      return String(a.wellPosition || a.well).localeCompare(
        String(b.wellPosition || b.well)
      );
    });

    return rows;
  }, [rawData, selectedSample, selectedTarget, hideNTC, hideUndetermined]);

  return (
    <div className="view-panel">
      <FilterBar
        samples={uniqueSamples}
        targets={uniqueTargets}
        selectedSample={selectedSample}
        selectedTarget={selectedTarget}
        onSampleChange={setSelectedSample}
        onTargetChange={setSelectedTarget}
        hideNTC={hideNTC}
        onHideNTCChange={setHideNTC}
        hideUndetermined={hideUndetermined}
        onHideUndeterminedChange={setHideUndetermined}
        variant="raw"
      />
      <p className="count-bar">
        Showing {filtered.length} wells
        <span className="count-sep">·</span>
        {stats.samples} samples
        <span className="count-sep">·</span>
        {stats.targets} targets
        {stats.ntc > 0 && (
          <>
            <span className="count-sep">·</span>
            {stats.ntc} NTC
          </>
        )}
        {stats.undetermined > 0 && (
          <>
            <span className="count-sep">·</span>
            {stats.undetermined} undetermined
          </>
        )}
      </p>
      <RawTable
        rows={filtered}
        sampleColors={sampleColors}
        hoveredSample={hoveredSample}
        onHoverSample={setHoveredSample}
      />
    </div>
  );
}
