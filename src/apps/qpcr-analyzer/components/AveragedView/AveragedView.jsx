import { useMemo, useState } from 'react';
import FilterBar from '../FilterBar';
import AveragedTable from './AveragedTable';

export default function AveragedView({
  averagedData,
  uniqueSamples,
  uniqueTargets,
  sampleColors,
  averagedStats,
}) {
  const [selectedSample, setSelectedSample] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [showOutliersOnly, setShowOutliersOnly] = useState(false);
  const [hoveredSample, setHoveredSample] = useState(null);

  const filtered = useMemo(() => {
    let rows = [...averagedData];

    if (selectedSample) {
      rows = rows.filter((r) => r.sampleName === selectedSample);
    }
    if (selectedTarget) {
      rows = rows.filter((r) => r.targetName === selectedTarget);
    }
    if (showOutliersOnly) {
      rows = rows.filter((r) => r.hasOutlier);
    }

    rows.sort((a, b) => {
      const sa = a.sampleName.localeCompare(b.sampleName);
      if (sa !== 0) return sa;
      return a.targetName.localeCompare(b.targetName);
    });

    return rows;
  }, [averagedData, selectedSample, selectedTarget, showOutliersOnly]);

  const sampleList = uniqueSamples.filter((s) =>
    averagedData.some((r) => r.sampleName === s)
  );

  return (
    <div className="view-panel">
      <p className="count-bar">
        N averaged groups: {averagedStats.groups}
        {averagedStats.highCv > 0 && (
          <>
            <span className="count-sep">·</span>
            High CV (&gt;5%): {averagedStats.highCv}
          </>
        )}
        {averagedStats.withUndetermined > 0 && (
          <>
            <span className="count-sep">·</span>
            Groups with undetermined: {averagedStats.withUndetermined}
          </>
        )}
      </p>
      <FilterBar
        samples={sampleList}
        targets={uniqueTargets}
        selectedSample={selectedSample}
        selectedTarget={selectedTarget}
        onSampleChange={setSelectedSample}
        onTargetChange={setSelectedTarget}
        showOutliersOnly={showOutliersOnly}
        onOutliersOnlyChange={setShowOutliersOnly}
        variant="averaged"
      />
      <AveragedTable
        data={filtered}
        sampleColors={sampleColors}
        hoveredSample={hoveredSample}
        onHoverSample={setHoveredSample}
      />
    </div>
  );
}
