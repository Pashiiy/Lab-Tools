import { useEffect } from 'react';
import { useGelQuantification } from './hooks/useGelQuantification';
import Sidebar from './components/Sidebar';
import CreationModeBar from './components/CreationModeBar';
import ImageViewer from './components/ImageViewer';
import RoiManager from './components/RoiManager';
import DataTable from './components/DataTable';
import './gel-quantification.css';

export default function GelQuantificationApp() {
  const {
    raw,
    displayAdjustments,
    setDisplayAdjustments,
    roiTemplate,
    setTemplate,
    loading,
    loadImage,
    activeTab,
    setActiveTab,
    pairs,
    rois,
    activeRoiId,
    creationMode,
    setCreationMode,
    incompletePair,
    strainName,
    description,
    averagedRatio,
    selectRoi,
    createRoiAtClick,
    deleteRoi,
    deletePair,
    renamePair,
    reorderPairs,
    updateSessionFields,
    setRoiUserLabel,
    reassignRoi,
    updateRoiGeometry,
    undo,
    redo,
    exportExcel,
    CREATION_MODES,
    ROI_ROLES,
    ROI_GEOMETRY,
  } = useGelQuantification();

  const completePairCount = pairs.filter((p) => p.complete).length;

  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  return (
    <div className="gel-quantification app">
      <header className="gq-header">
        <h1 className="gq-header__title">Gel Quantification</h1>
        <span className="gq-header__badge">FIJI_COMPATIBILITY_MODE</span>
      </header>

      <div className="gq-layout">
        <Sidebar
          raw={raw}
          loading={loading}
          displayAdjustments={displayAdjustments}
          roiTemplate={roiTemplate}
          pairCount={pairs.length}
          completePairCount={completePairCount}
          onLoadImage={loadImage}
          onDisplayAdjustmentsChange={setDisplayAdjustments}
          onTemplateChange={setTemplate}
          strainName={strainName}
          description={description}
          onSessionFieldsChange={updateSessionFields}
          onExport={exportExcel}
        />

        <div className="gq-main">
          <nav className="gq-tabs">
            <button
              type="button"
              className={`gq-tabs__btn${activeTab === 'image' ? ' gq-tabs__btn--active' : ''}`}
              onClick={() => setActiveTab('image')}
            >
              Image View
            </button>
            <button
              type="button"
              className={`gq-tabs__btn${activeTab === 'data' ? ' gq-tabs__btn--active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              Data Table
            </button>
          </nav>

          <div className="gq-workspace">
            {activeTab === 'image' ? (
              <>
                <div className="gq-workspace__center">
                  {raw && (
                    <CreationModeBar
                      creationMode={creationMode}
                      CREATION_MODES={CREATION_MODES}
                      incompletePair={incompletePair}
                      onModeChange={setCreationMode}
                    />
                  )}
                  <ImageViewer
                    raw={raw}
                    imageWidth={raw?.width}
                    imageHeight={raw?.height}
                    displayAdjustments={displayAdjustments}
                    rois={rois}
                    activeRoiId={activeRoiId}
                    onRoiClick={createRoiAtClick}
                    onSelectRoi={selectRoi}
                  />
                </div>
                <RoiManager
                  pairs={pairs}
                  activeRoiId={activeRoiId}
                  ROI_ROLES={ROI_ROLES}
                  ROI_GEOMETRY={ROI_GEOMETRY}
                  onSelectRoi={selectRoi}
                  onRenamePair={renamePair}
                  onReorderPairs={reorderPairs}
                  onDeletePair={deletePair}
                  onUserLabelChange={setRoiUserLabel}
                  onReassign={reassignRoi}
                  onDelete={deleteRoi}
                  onGeometryChange={updateRoiGeometry}
                />
              </>
            ) : (
              <DataTable
                pairs={pairs}
                averagedRatio={averagedRatio}
                activeRoiId={activeRoiId}
                onSelectRoi={selectRoi}
                onUserLabelChange={setRoiUserLabel}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
