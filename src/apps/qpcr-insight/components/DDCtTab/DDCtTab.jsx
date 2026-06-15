import { useEffect, useMemo, useState } from 'react';
import ConfigPanel from './ConfigPanel';
import ResultsTable from './ResultsTable';
import ChartPanel from './ChartPanel';
import EmptyState from '../EmptyState';

export default function DDCtTab({
  uniqueTargets,
  uniqueSamples,
  referenceGene,
  calibratorSample,
  onReferenceGeneChange,
  onCalibratorSampleChange,
  ddCtResults,
  averagedData,
  sampleColors,
}) {
  const [chartView, setChartView] = useState('rq');
  const [dismissSdBanner, setDismissSdBanner] = useState(false);

  useEffect(() => {
    if (!calibratorSample && chartView === 'bar') {
      setChartView('rq');
    }
  }, [calibratorSample, chartView]);

  const showSdBanner = useMemo(() => {
    if (dismissSdBanner || !ddCtResults) return false;
    return ddCtResults.some((r) => /No SD available/i.test(r.warning || ''));
  }, [ddCtResults, dismissSdBanner]);

  const ready = referenceGene && ddCtResults;

  return (
    <div className="qi-data-tab qi-ddct-tab">
      <ConfigPanel
        uniqueTargets={uniqueTargets}
        uniqueSamples={uniqueSamples}
        referenceGene={referenceGene}
        calibratorSample={calibratorSample}
        onReferenceGeneChange={onReferenceGeneChange}
        onCalibratorSampleChange={onCalibratorSampleChange}
      />

      {!ready ? (
        <EmptyState
          icon="Δ"
          message="Select a reference gene to see normalized RQ results."
        />
      ) : (
        <>
          {showSdBanner && (
            <div className="qi-ddct-banner">
              <p>
                Some samples have only 1 replicate — error bars are not shown for those rows.
              </p>
              <button type="button" onClick={() => setDismissSdBanner(true)} aria-label="Dismiss">
                ✕
              </button>
            </div>
          )}

          <ResultsTable
            ddCtResults={ddCtResults}
            averagedData={averagedData}
            referenceGene={referenceGene}
            sampleColors={sampleColors}
            calibratorSample={calibratorSample}
          />

          <ChartPanel
            ddCtResults={ddCtResults}
            sampleColors={sampleColors}
            calibratorSample={calibratorSample}
            chartView={chartView}
            onChartViewChange={setChartView}
          />
        </>
      )}
    </div>
  );
}
