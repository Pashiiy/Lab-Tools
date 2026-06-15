import { useMemo, useState } from 'react';
import FilterBar from './FilterBar';
import RawTable from './RawTable';

export default function RawDataTab({
  replicates,
  uniqueSamples,
  uniqueTargets,
  sampleColors,
  outlierIds,
  hasWellColumn,
}) {
  const [sampleFilter, setSampleFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [hideNtc, setHideNtc] = useState(false);
  const [hideUndetermined, setHideUndetermined] = useState(false);

  const filteredRows = useMemo(() => {
    return replicates.filter((r) => {
      if (sampleFilter && r.sampleName !== sampleFilter) return false;
      if (targetFilter && r.targetName !== targetFilter) return false;
      if (hideNtc && r.isNTC) return false;
      if (hideUndetermined && r.cq === null) return false;
      return true;
    });
  }, [replicates, sampleFilter, targetFilter, hideNtc, hideUndetermined]);

  const stats = useMemo(() => {
    const ntcCount = filteredRows.filter((r) => r.isNTC).length;
    const undetCount = filteredRows.filter((r) => r.cq === null).length;
    const outlierCount = filteredRows.filter((r) => outlierIds.has(r.id)).length;
    const samples = new Set(filteredRows.map((r) => r.sampleName)).size;
    const targets = new Set(filteredRows.map((r) => r.targetName)).size;
    return { ntcCount, undetCount, outlierCount, samples, targets };
  }, [filteredRows, outlierIds]);

  return (
    <div className="qi-data-tab">
      <FilterBar
        samples={uniqueSamples}
        targets={uniqueTargets}
        sampleFilter={sampleFilter}
        targetFilter={targetFilter}
        hideNtc={hideNtc}
        hideUndetermined={hideUndetermined}
        onSampleChange={setSampleFilter}
        onTargetChange={setTargetFilter}
        onHideNtcChange={setHideNtc}
        onHideUndeterminedChange={setHideUndetermined}
      />
      <p className="qi-count-bar">
        Showing <strong>{filteredRows.length}</strong> replicates ·{' '}
        <strong>{stats.samples}</strong> samples · <strong>{stats.targets}</strong> targets ·{' '}
        <strong>{stats.ntcCount}</strong> NTC · <strong>{stats.undetCount}</strong> undetermined ·{' '}
        <strong>{stats.outlierCount}</strong> outliers
      </p>
      <RawTable
        rows={filteredRows}
        hasWellColumn={hasWellColumn}
        sampleColors={sampleColors}
        outlierIds={outlierIds}
      />
    </div>
  );
}
