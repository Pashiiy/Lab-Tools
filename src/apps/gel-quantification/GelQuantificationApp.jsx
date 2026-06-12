import { useEffect } from 'react';
import { useGelQuantification } from './hooks/useGelQuantification';
import Sidebar from './components/Sidebar';
import CreationModeBar from './components/CreationModeBar';
import ImageViewer from './components/ImageViewer';
import RoiManager from './components/RoiManager';
import DataTable from './components/DataTable';
import GelSelector from './components/GelSelector';
import './gel-quantification.css';

export default function GelQuantificationApp() {
  const gq = useGelQuantification();

  const completePairCount = gq.pairs.filter((p) => p.complete).length;

  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          gq.undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          gq.redo();
        }
        return;
      }

      if (gq.activeTab !== 'image' || gq.gels.length < 2) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        gq.goToPrevGel();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        gq.goToNextGel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gq]);

  const handleSelectGelFromTable = (gelId) => {
    if (gelId && gelId !== gq.activeGelId) {
      gq.switchToGel(gelId);
      gq.setActiveTab('image');
    }
  };

  return (
    <div className="gel-quantification app">
      <header className="gq-header">
        <h1 className="gq-header__title">Gel Quantification</h1>
        <span className="gq-header__badge">FIJI_COMPATIBILITY_MODE</span>
      </header>

      <div className="gq-layout">
        <Sidebar
          raw={gq.raw}
          gelCount={gq.gels.length}
          loading={gq.loading}
          displayAdjustments={gq.displayAdjustments}
          inverted={gq.inverted}
          roiTemplate={gq.roiTemplate}
          pairCount={gq.pairs.length}
          completePairCount={completePairCount}
          totalCompletePairs={gq.totalCompletePairs}
          strainName={gq.strainName}
          description={gq.description}
          onAddGel={gq.addGelFromFile}
          onDisplayAdjustmentsChange={gq.setDisplayAdjustments}
          onInvertedChange={gq.setInverted}
          onTemplateChange={gq.setTemplate}
          onResetTemplateDefaults={gq.resetTemplateDefaults}
          onSessionFieldsChange={gq.updateSessionFields}
          onExportExcel={gq.exportExcel}
          onExportCsv={gq.exportCsv}
        />

        <div className="gq-main">
          <nav className="gq-tabs" data-tour="gq-tabs">
            <button
              type="button"
              className={`gq-tabs__btn${gq.activeTab === 'image' ? ' gq-tabs__btn--active' : ''}`}
              onClick={() => gq.setActiveTab('image')}
            >
              Image View
            </button>
            <button
              type="button"
              className={`gq-tabs__btn${gq.activeTab === 'data' ? ' gq-tabs__btn--active' : ''}`}
              onClick={() => gq.setActiveTab('data')}
            >
              Data Table
            </button>
          </nav>

          <div className="gq-workspace">
            {gq.activeTab === 'image' ? (
              <>
                <div className="gq-workspace__center">
                  {gq.raw && (
                    <>
                      <GelSelector
                        gels={gq.gels}
                        activeGelId={gq.activeGelId}
                        onSelect={gq.switchToGel}
                        onRename={gq.renameGel}
                        onPrev={gq.goToPrevGel}
                        onNext={gq.goToNextGel}
                        canPrev={gq.activeGelIndex > 0}
                        canNext={gq.activeGelIndex < gq.gels.length - 1}
                      />
                      <CreationModeBar
                        creationMode={gq.creationMode}
                        CREATION_MODES={gq.CREATION_MODES}
                        incompletePair={gq.incompletePair}
                        onModeChange={gq.setCreationMode}
                      />
                    </>
                  )}
                  <ImageViewer
                    gelId={gq.activeGelId}
                    raw={gq.raw}
                    imageWidth={gq.raw?.width}
                    imageHeight={gq.raw?.height}
                    displayAdjustments={gq.displayAdjustments}
                    inverted={gq.inverted}
                    rois={gq.rois}
                    activeRoiId={gq.activeRoiId}
                    onRoiClick={gq.createRoiAtClick}
                    onSelectRoi={gq.selectRoi}
                  />
                </div>
                <RoiManager
                  pairs={gq.pairs}
                  activeRoiId={gq.activeRoiId}
                  ROI_ROLES={gq.ROI_ROLES}
                  ROI_GEOMETRY={gq.ROI_GEOMETRY}
                  onSelectRoi={gq.selectRoi}
                  onRenamePair={gq.renamePair}
                  onReorderPairs={gq.reorderPairs}
                  onDeletePair={gq.deletePair}
                  onUserLabelChange={gq.setRoiUserLabel}
                  onReassign={gq.reassignRoi}
                  onDelete={gq.deleteRoi}
                  onGeometryChange={gq.updateRoiGeometry}
                />
              </>
            ) : (
              <DataTable
                pairs={gq.allEnrichedPairs}
                gels={gq.gels}
                activeGelId={gq.activeGelId}
                sessionAveragedRatio={gq.sessionAveragedRatio}
                activeRoiId={gq.activeRoiId}
                onSelectRoi={gq.selectRoi}
                onUserLabelChange={gq.setRoiUserLabel}
                onSelectGel={handleSelectGelFromTable}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
