import { useMemo } from 'react';
import AveragedTable from './AveragedTable';
import NTCSummary from './NTCSummary';

export default function AveragedTab({
  replicates,
  averagedData,
  sampleColors,
  outlierIds,
}) {
  const summary = useMemo(() => {
    const highCv = averagedData.filter((r) => r.cv != null && r.cv > 5).length;
    const withUndet = averagedData.filter((r) => r.undeterminedCount > 0).length;
    return { highCv, withUndet };
  }, [averagedData]);

  return (
    <div className="qi-data-tab">
      <p className="qi-count-bar">
        <strong>{averagedData.length}</strong> sample/target combinations · High CV (&gt;5%):{' '}
        <strong>{summary.highCv}</strong> · Groups with undetermined values:{' '}
        <strong>{summary.withUndet}</strong>
      </p>
      <AveragedTable
        rows={averagedData}
        sampleColors={sampleColors}
        outlierIds={outlierIds}
        replicates={replicates}
      />
      <NTCSummary replicates={replicates} />
    </div>
  );
}
