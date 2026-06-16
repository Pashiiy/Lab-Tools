import { useEffect } from 'react';
import { useGelQuantification } from './hooks/useGelQuantification';
import Sidebar from './components/Sidebar';
import CreationModeBar from './components/CreationModeBar';
import ImageViewer from './components/ImageViewer';
import RoiManager from './components/RoiManager';
import DataTable from './components/DataTable';
import GelSelector from './components/GelSelector';
import FijiExcelValidator from './components/FijiExcelValidator';
import ParityAudit from './components/ParityAudit';
import { useToolSnapshot } from '../../shared/persistence/useToolSnapshot';
import ToolHeader from '../../shared/ui/ToolHeader';
import LtTabs from '../../shared/ui/LtTabs';
import ToolActionBar from '../../shared/ui/ToolActionBar';
import './gel-quantification.css';

const GEL_TABS = [
  { id: 'image', label: 'Image View' },
  { id: 'data', label: 'Data Table' },
  { id: 'validator', label: 'Fiji/Excel Validator' },
  { id: 'parity', label: 'Parity Audit' },
];

export default function GelQuantificationApp({ instanceId, initialState = null }) {
  const gq = useGelQuantification(initialState);

  useToolSnapshot(instanceId, 'gel-quantification', gq.getSnapshot);

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
      <ToolHeader
        title="Gel Quantification"
        badge="Fiji mode"
      />

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
        />

        <div className="gq-main">
          <LtTabs
            tabs={GEL_TABS}
            activeId={gq.activeTab}
            onChange={gq.setActiveTab}
            ariaLabel="Gel quantification views"
          />

          {gq.totalCompletePairs > 0 && (
            <ToolActionBar hint={`${gq.totalCompletePairs} complete pair${gq.totalCompletePairs !== 1 ? 's' : ''}`}>
              <button
                type="button"
                className="lt-btn lt-btn--primary"
                onClick={gq.exportExcel}
              >
                Export Excel
              </button>
              <button type="button" className="lt-btn" onClick={gq.exportCsv}>
                Export CSV
              </button>
            </ToolActionBar>
          )}

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
            ) : gq.activeTab === 'validator' ? (
              <FijiExcelValidator />
            ) : gq.activeTab === 'parity' ? (
              <ParityAudit
                rois={gq.rois}
                fijiParityMode={gq.fijiParityMode}
                onFijiParityModeChange={gq.setFijiParityMode}
              />
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
