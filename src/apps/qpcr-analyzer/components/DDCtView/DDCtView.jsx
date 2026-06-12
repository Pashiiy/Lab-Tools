import DDCtConfigPanel from './DDCtConfigPanel';
import DDCtTable from './DDCtTable';
import DDCtCharts from './DDCtCharts';

export default function DDCtView({
  uniqueSamples,
  uniqueTargets,
  sampleColors,
  referenceGene,
  controlSample,
  setReferenceGene,
  setControlSample,
  ddCtResults,
  rawData,
}) {
  const configured = referenceGene && controlSample;

  return (
    <div className="view-panel ddct-view">
      <DDCtConfigPanel
        uniqueTargets={uniqueTargets}
        uniqueSamples={uniqueSamples}
        referenceGene={referenceGene}
        controlSample={controlSample}
        onReferenceChange={setReferenceGene}
        onControlChange={setControlSample}
      />

      {!configured && (
        <div className="ddct-placeholder">
          <p>Select a reference gene and control sample above to calculate fold changes.</p>
        </div>
      )}

      {configured && ddCtResults && (
        <>
          <DDCtTable
            results={ddCtResults}
            controlSample={controlSample}
            sampleColors={sampleColors}
          />
          <DDCtCharts
            ddCtResults={ddCtResults}
            rawData={rawData}
            referenceGene={referenceGene}
            controlSample={controlSample}
            sampleColors={sampleColors}
            uniqueTargets={uniqueTargets}
          />
        </>
      )}
    </div>
  );
}
