import { useCallback } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import GelPanel from './components/GelPanel/GelPanel';
import DataTable from './components/DataTable/DataTable';
import SummaryPanel from './components/SummaryPanel';
import ChartPanel from './components/ChartPanel';
import ScoreGelsView from './components/ScoreGelsView/ScoreGelsView';
import RestoreBanner from './components/RestoreBanner';
import { useEndpointAnalysis } from './hooks/useEndpointAnalysis';
import { exportToExcel } from './utils/exportExcel';
import './App.css';

export default function EndpointAnalysisApp({ instanceId }) {
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
    removeGel,
    updateGelAdjustment,
    resetGelAdjustments,
    classifiedCounts,
    stackedBarData,
    categoryCounts,
    activeTab,
    setActiveTab,
    showRestorePrompt,
    pendingRestore,
    restoreAutosave,
    discardAutosave,
  } = useEndpointAnalysis(instanceId);

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
      <Header
        strainName={strainName}
        setStrainName={setStrainName}
        colonyCount={colonyCount}
        setColonyCount={setColonyCount}
        onExport={handleExportExcel}
      />
      {showRestorePrompt && pendingRestore && (
        <RestoreBanner
          savedAt={pendingRestore.savedAt}
          onRestore={restoreAutosave}
          onDiscard={discardAutosave}
        />
      )}
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main">
        {activeTab === 'score-gels' ? (
          <ScoreGelsView
            gels={gels}
            colonies={colonies}
            colonyCount={colonyCount}
            onUpload={uploadGel}
            onUpdateAdjustment={updateGelAdjustment}
            onResetAdjustments={resetGelAdjustments}
            onToggle={toggleColonyScore}
          />
        ) : (
          <>
            <GelPanel
              gels={gels}
              onUpload={uploadGel}
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
                  onExportExcel={handleExportExcel}
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
