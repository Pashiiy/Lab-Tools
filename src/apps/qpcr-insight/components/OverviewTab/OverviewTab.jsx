import SummaryCard from './SummaryCard';
import RunInfoSection from './RunInfoSection';
import PlateSetupSection from './PlateSetupSection';
import MethodSection from './MethodSection';
import AmpCurvesSection from './AmpCurvesSection';

export default function OverviewTab({
  experiment,
  uniqueTargets,
  sampleColors,
  targetColors,
}) {
  return (
    <div className="qi-overview">
      <SummaryCard experiment={experiment} />
      <RunInfoSection runInfo={experiment.runInfo} source={experiment.source} />
      <PlateSetupSection
        plateSetup={experiment.plateSetup}
        targetColors={targetColors}
        sampleColors={sampleColors}
      />
      <MethodSection method={experiment.method} />
      <AmpCurvesSection
        ampCurves={experiment.ampCurves}
        replicates={experiment.replicates}
        uniqueTargets={uniqueTargets}
        sampleColors={sampleColors}
      />
    </div>
  );
}
