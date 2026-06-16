import { useCallback } from 'react';
import GelPanel from './components/GelPanel/GelPanel';
import DataTable from './components/DataTable/DataTable';
import SummaryPanel from './components/SummaryPanel';
import ChartPanel from './components/ChartPanel';
import ScoreGelsView from './components/ScoreGelsView/ScoreGelsView';
import { useEndpointAnalysis } from './hooks/useEndpointAnalysis';
import { exportToExcel } from './utils/exportExcel';
import { useToolSnapshot } from '../../shared/persistence/useToolSnapshot';
import { validateSession } from './utils/session';
import ToolHeader from '../../shared/ui/ToolHeader';
import LtTabs from '../../shared/ui/LtTabs';
import ToolActionBar from '../../shared/ui/ToolActionBar';
import './App.css';
import '../../shared/image/image-import.css';

const EA_TABS = [
  { id: 'score-gels', label: 'Score Gels' },
  { id: 'overview', label: 'Overview' },
];

export default function EndpointAnalysisApp({ instanceId, initialState = null }) {
  const {
    strainName,
    setStrainName,
    colonyCount,
    setColonyCount,
    gels,
    colonies,
    classifiedCount,
    summaryCounts,
    toggleColonyScore,
    uploadGel,
    clearGelError,
    removeGel,
    updateGelAdjustment,
    resetGelAdjustments,
    classifiedCounts,
    stackedBarData,
    categoryCounts,
    activeTab,
    setActiveTab,
    getSnapshot,
  } = useEndpointAnalysis(instanceId, initialState);

  useToolSnapshot(instanceId, 'endpoint-analysis', () => {
    const snap = getSnapshot();
    return validateSession(snap) ? snap : undefined;
  });

  const handleExportExcel = useCallback(async () => {
    await exportToExcel({
      strainName,
      colonies,
      colonyCount,
      classifiedCounts,
      categoryCounts,
      summaryCounts,
      gels,
    });
  }, [
    strainName,
    colonies,
    colonyCount,
    classifiedCounts,
    categoryCounts,
    summaryCounts,
    gels,
  ]);

  return (
    <div className="endpoint-analysis app">
      <ToolHeader
        title="Endpoint Analyzer"
        actions={
          <>
            <label className="ea-header-field">
              <span className="ea-header-field__label">Strain</span>
              <input
                type="text"
                className="lt-input ea-header-field__input"
                value={strainName}
                onChange={(e) => setStrainName(e.target.value)}
                placeholder="strain name"
                data-tour="ea-strain"
              />
            </label>
            <label className="ea-header-field">
              <span className="ea-header-field__label">Colonies</span>
              <input
                type="number"
                className="lt-input ea-header-field__input ea-header-field__input--num"
                value={colonyCount}
                min={1}
                max={999}
                onChange={(e) => setColonyCount(e.target.value)}
              />
            </label>
          </>
        }
      />

      <LtTabs
        tabs={EA_TABS}
        activeId={activeTab}
        onChange={setActiveTab}
        ariaLabel="Endpoint analysis views"
      />

      <ToolActionBar hint={`${classifiedCount} / ${colonyCount} scored`}>
        <button
          type="button"
          className="lt-btn lt-btn--primary"
          data-tour="ea-export"
          onClick={handleExportExcel}
        >
          Export Excel
        </button>
      </ToolActionBar>

      <main className="main">
        {activeTab === 'score-gels' ? (
          <ScoreGelsView
            gels={gels}
            colonies={colonies}
            colonyCount={colonyCount}
            onUpload={uploadGel}
            onClearError={clearGelError}
            onUpdateAdjustment={updateGelAdjustment}
            onResetAdjustments={resetGelAdjustments}
            onToggle={toggleColonyScore}
          />
        ) : (
          <>
            <GelPanel
              gels={gels}
              onUpload={uploadGel}
              onClearError={clearGelError}
              onRemove={removeGel}
              onUpdateAdjustment={updateGelAdjustment}
              onResetAdjustments={resetGelAdjustments}
            />
            <div className="content-row">
              <section className="content-left">
                <DataTable
                  colonies={colonies}
                  classifiedCount={classifiedCount}
                  colonyCount={colonyCount}
                  onToggle={toggleColonyScore}
                />
              </section>
              <section className="content-right">
                <ChartPanel
                  classifiedCounts={classifiedCounts}
                  stackedBarData={stackedBarData}
                  categoryCounts={categoryCounts}
                  strainName={strainName}
                />
                <SummaryPanel
                  summaryCounts={summaryCounts}
                  colonyCount={colonyCount}
                />
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
