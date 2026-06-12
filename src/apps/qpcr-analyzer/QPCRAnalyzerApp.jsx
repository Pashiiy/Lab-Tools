import { useCallback } from 'react';
import { useQPCRData } from './hooks/useQPCRData';
import { exportQPCRExcel } from './utils/exportExcel';
import Header from './components/Header';
import UploadZone from './components/UploadZone';
import WorkspaceView from './components/Workspace/WorkspaceView';
import WorkspaceToolbar from './components/Workspace/WorkspaceToolbar';
import AdvancedPanel from './components/Workspace/AdvancedPanel';
import MethodTab from './components/MethodTab/MethodTab';
import ResultsTab from './components/ResultsTab/ResultsTab';
import RawDataView from './components/RawDataView/RawDataView';
import AveragedView from './components/AveragedView/AveragedView';
import DDCtView from './components/DDCtView/DDCtView';
import './qpcr-theme.css';
import './qpcr-analyzer.css';

export default function QPCRAnalyzerApp() {
  const qpcr = useQPCRData();

  const handleExport = useCallback(() => {
    exportQPCRExcel({
      rawData: qpcr.rawData,
      rawHeaders: qpcr.rawHeaders,
      averagedData: qpcr.averagedData,
      ddCtResults: qpcr.ddCtResults,
      sampleColors: qpcr.sampleColors,
      referenceGene: qpcr.referenceGene,
      controlSample: qpcr.controlSample,
      fileName: qpcr.fileName,
    });
  }, [qpcr]);

  const renderAdvanced = () => {
    switch (qpcr.advancedMode) {
      case 'raw':
        return (
          <RawDataView
            rawData={qpcr.rawData}
            uniqueSamples={qpcr.uniqueSamples}
            uniqueTargets={qpcr.uniqueTargets}
            sampleColors={qpcr.sampleColors}
            stats={qpcr.stats}
          />
        );
      case 'averaged':
        return (
          <AveragedView
            averagedData={qpcr.averagedData}
            uniqueSamples={qpcr.uniqueSamples}
            uniqueTargets={qpcr.uniqueTargets}
            sampleColors={qpcr.sampleColors}
            averagedStats={qpcr.averagedStats}
          />
        );
      case 'ddct':
        return (
          <DDCtView
            uniqueSamples={qpcr.uniqueSamples}
            uniqueTargets={qpcr.uniqueTargets}
            sampleColors={qpcr.sampleColors}
            referenceGene={qpcr.referenceGene}
            controlSample={qpcr.controlSample}
            setReferenceGene={qpcr.setReferenceGene}
            setControlSample={qpcr.setControlSample}
            ddCtResults={qpcr.ddCtResults}
            rawData={qpcr.rawData}
          />
        );
      case 'results':
        return (
          <ResultsTab
            experiment={qpcr.experiment}
            liveCtLookup={qpcr.liveCtLookup}
            omittedWells={qpcr.omittedWells}
            onToggleOmit={qpcr.toggleOmit}
            uniqueSamples={qpcr.uniqueSamples}
            uniqueTargets={qpcr.uniqueTargets}
          />
        );
      case 'method':
        return qpcr.experiment ? (
          <MethodTab experiment={qpcr.experiment} />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="qpcr-analyzer">
      <div className="app">
        <Header
          fileName={qpcr.fileName}
          experimentName={qpcr.experimentName}
          stats={qpcr.stats}
          onUpload={qpcr.loadFile}
          onExport={handleExport}
          hasData={qpcr.hasData}
        />
        <main className="app-main app-main--workspace">
          {!qpcr.hasData ? (
            <UploadZone
              onFile={qpcr.loadFile}
              parseError={qpcr.parseError}
              loading={qpcr.loading}
            />
          ) : (
            <>
              <WorkspaceToolbar
                advancedMode={qpcr.advancedMode}
                onSelectMode={qpcr.setAdvancedMode}
              />
              {qpcr.advancedMode ? (
                <AdvancedPanel
                  mode={qpcr.advancedMode}
                  onClose={() => qpcr.setAdvancedMode(null)}
                >
                  {renderAdvanced()}
                </AdvancedPanel>
              ) : (
                qpcr.experiment && (
                  <div data-tour="qpcr-workspace" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                    <WorkspaceView qpcr={qpcr} />
                  </div>
                )
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
