import { useMemo } from 'react';
import FilterSidebar from './FilterSidebar';
import WorkspaceAmpChart from './WorkspaceAmpChart';
import MeltCurveChart from './MeltCurveChart';
import RunSummaryPanel from './RunSummaryPanel';
import InteractivePlate from './InteractivePlate';
import StandardCurvePanel from './StandardCurvePanel';
import CollapsibleSection from './CollapsibleSection';
import { getVisibleSeries, computeSelectionStats } from '../../utils/workspaceFilters';
import { hasMeltData } from '../../utils/meltCurve';

export default function WorkspaceView({ qpcr }) {
  const visibleSeries = useMemo(
    () =>
      getVisibleSeries(
        qpcr.experiment,
        qpcr.filterSamples,
        qpcr.filterTargets,
        qpcr.plateSelectedWells
      ),
    [
      qpcr.experiment,
      qpcr.filterSamples,
      qpcr.filterTargets,
      qpcr.plateSelectedWells,
    ]
  );

  const selectionStats = useMemo(
    () =>
      computeSelectionStats(
        visibleSeries,
        qpcr.liveCtLookup,
        qpcr.omittedWells
      ),
    [visibleSeries, qpcr.liveCtLookup, qpcr.omittedWells]
  );

  const thresholdTarget =
    qpcr.filterTargets.size === 1
      ? [...qpcr.filterTargets][0]
      : qpcr.activeTarget;

  const meltAvailable = hasMeltData(qpcr.experiment);

  return (
    <div className="ws-layout">
      <FilterSidebar
        samples={qpcr.experiment.samples}
        targets={qpcr.experiment.targets}
        filterSamples={qpcr.filterSamples}
        setFilterSamples={qpcr.setFilterSamples}
        filterTargets={qpcr.filterTargets}
        setFilterTargets={qpcr.setFilterTargets}
        displayOptions={qpcr.displayOptions}
        setDisplayOptions={qpcr.setDisplayOptions}
        chartColorBy={qpcr.chartColorBy}
        setChartColorBy={qpcr.setChartColorBy}
        plateColorBy={qpcr.plateColorBy}
        setPlateColorBy={qpcr.setPlateColorBy}
        hasMelt={meltAvailable}
        hasStandardCurve={qpcr.hasStandardCurve}
        activeTarget={thresholdTarget}
        setActiveTarget={qpcr.setActiveTarget}
        thresholds={qpcr.thresholds}
        setThreshold={qpcr.setThreshold}
        onAutoThreshold={qpcr.autoThreshold}
      />

      <div className="ws-center">
        {qpcr.displayOptions.amplification && (
          <section className="ws-chart-section">
            <div className="ws-chart-header">
              <h3 className="ws-chart-title">Amplification Plot</h3>
              <span className="ws-chart-meta">
                {visibleSeries.length} curves · Log Y-axis · Cycle 0 start
              </span>
            </div>
            <WorkspaceAmpChart
              experiment={qpcr.experiment}
              visibleSeries={visibleSeries}
              displayMode="Log ΔRn"
              chartColorBy={qpcr.chartColorBy}
              sampleColors={qpcr.sampleColors}
              targetColors={qpcr.targetColors}
              plateSelectedWells={qpcr.plateSelectedWells}
              omittedWells={qpcr.omittedWells}
              thresholds={qpcr.thresholds}
              activeTarget={thresholdTarget}
              onThresholdChange={(v) =>
                thresholdTarget && qpcr.setThreshold(thresholdTarget, v)
              }
              logScale
            />
          </section>
        )}

        {qpcr.displayOptions.melt && meltAvailable && (
          <CollapsibleSection
            title="Melt Curve"
            collapsed={qpcr.collapsed.melt}
            onToggle={() => qpcr.toggleCollapsed('melt')}
          >
            <MeltCurveChart
              visibleSeries={visibleSeries}
              chartColorBy={qpcr.chartColorBy}
              sampleColors={qpcr.sampleColors}
              targetColors={qpcr.targetColors}
              plateSelectedWells={qpcr.plateSelectedWells}
            />
          </CollapsibleSection>
        )}

        {qpcr.displayOptions.standardCurve && qpcr.hasStandardCurve && (
          <CollapsibleSection
            title="Standard Curve"
            collapsed={qpcr.collapsed.standardCurve}
            onToggle={() => qpcr.toggleCollapsed('standardCurve')}
          >
            <StandardCurvePanel
              experiment={qpcr.experiment}
              liveCtLookup={qpcr.liveCtLookup}
            />
          </CollapsibleSection>
        )}

        <CollapsibleSection
          title="Plate View"
          collapsed={qpcr.collapsed.plate}
          onToggle={() => qpcr.toggleCollapsed('plate')}
        >
          <InteractivePlate
            wells={qpcr.experiment.wells}
            plateColorBy={qpcr.plateColorBy}
            targetColors={qpcr.targetColors}
            sampleColors={qpcr.sampleColors}
            plateSelectedWells={qpcr.plateSelectedWells}
            filterSamples={qpcr.filterSamples}
            filterTargets={qpcr.filterTargets}
            omittedWells={qpcr.omittedWells}
            onWellPointerDown={qpcr.handlePlateWellDown}
            onWellPointerEnter={qpcr.handlePlateWellEnter}
            onClearSelection={qpcr.clearPlateSelection}
            onDragEnd={qpcr.endPlateDrag}
          />
        </CollapsibleSection>
      </div>

      <aside className="ws-right">
        {qpcr.displayOptions.statistics && (
          <CollapsibleSection
            title="Run Summary"
            collapsed={qpcr.collapsed.summary}
            onToggle={() => qpcr.toggleCollapsed('summary')}
          >
            <RunSummaryPanel
              experiment={qpcr.experiment}
              stats={qpcr.stats}
              visibleSeries={visibleSeries}
              selectionStats={selectionStats}
            />
          </CollapsibleSection>
        )}
      </aside>
    </div>
  );
}
