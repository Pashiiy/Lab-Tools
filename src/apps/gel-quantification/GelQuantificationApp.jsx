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
import { isEditableTarget } from '../../shared/input/isEditableTarget';
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

export default function GelQuantificationApp({ instanceId, isActive = true, initialState = null }) {
  const gq = useGelQuantification(initialState);
  const {
    undo,
    redo,
    goToPrevGel,
    goToNextGel,
    activeTab,
    gels,
  } = gq;

  useToolSnapshot(instanceId, 'gel-quantification', gq.getSnapshot);

  const completePairCount = gq.pairs.filter((p) => p.complete).length;

  useEffect(() => {
    if (!isActive) return undefined;

    const onKeyDown = (e) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          redo();
        }
        return;
      }

      if (activeTab !== 'image' || gels.length < 2) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevGel();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextGel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActive, activeTab, gels.length, undo, redo, goToPrevGel, goToNextGel]);

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
          loadingLabel={gq.loadingLabel}
          displayAdjustments={gq.displayAdjustments}
          inverted={gq.inverted}
          roiTemplate={gq.roiTemplate}
          pairCount={gq.pairs.length}
          completePairCount={completePairCount}
          strainName={gq.strainName}
          description={gq.description}
          onAddGel={gq.addGelFromFile}
          onAddGels={gq.addGelsFromFiles}
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

          <ToolActionBar
            hint={
              gq.totalCompletePairs > 0
                ? `${gq.totalCompletePairs} complete pair${gq.totalCompletePairs !== 1 ? 's' : ''}`
                : 'Complete a Target/Control pair to enable export'
            }
          >
            <button
              type="button"
              className="lt-btn lt-btn--primary"
              onClick={gq.exportExcel}
              disabled={gq.totalCompletePairs === 0}
            >
              Export Excel
            </button>
            <button
              type="button"
              className="lt-btn"
              onClick={gq.exportCsv}
              disabled={gq.totalCompletePairs === 0}
            >
              Export CSV
            </button>
          </ToolActionBar>

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
                    isActive={isActive}
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
