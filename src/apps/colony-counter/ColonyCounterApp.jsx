import { useCallback, useEffect, useMemo, useState } from 'react';
import { useColonyCounter } from './hooks/useColonyCounter';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import BatchSummary from './components/BatchSummary';
import IOSInstallBanner from './components/IOSInstallBanner';
import SessionNameEditor from './components/SessionNameEditor';
import { useToolSnapshot } from '../../shared/persistence/useToolSnapshot';
import {
  isAutoCountAvailable,
  isMaskComplete,
  requestAutoCount,
  requestSuggestDish,
} from './utils/autoCountClient';
import ToolHeader from '../../shared/ui/ToolHeader';
import ToolActionBar from '../../shared/ui/ToolActionBar';
import LtTabs from '../../shared/ui/LtTabs';
import './colony-counter.css';
import '../../shared/image/image-import.css';

const CC_TABS = [
  { id: 'marking', label: 'Mark Colonies' },
  { id: 'summary', label: 'Batch Summary' },
];

export default function ColonyCounterApp({ instanceId, isActive, initialState = null }) {
  const [viewTab, setViewTab] = useState('marking');
  const [autoCountBusy, setAutoCountBusy] = useState(false);
  const [autoCountDone, setAutoCountDone] = useState(false);
  const [autoCountError, setAutoCountError] = useState(null);
  const [autoCountByType, setAutoCountByType] = useState(null);
  const [interactionMode, setInteractionMode] = useState('mark');
  const [masksByPlate, setMasksByPlate] = useState({});
  const [draftPolygon, setDraftPolygon] = useState([]);
  const [suggestBusy, setSuggestBusy] = useState(false);

  const {
    dots,
    categories,
    activeCategory,
    setActiveCategory,
    categoryCounts,
    updateCategoryLabel,
    updateCategoryColor,
    addCategory,
    deleteCategory,
    dotRadius,
    setDotRadius,
    opacity,
    setOpacity,
    image,
    loadingImage,
    loadingLabel,
    uploadError,
    dismissUploadError,
    addPlatesFromFiles,
    addDot,
    removeDot,
    moveDot,
    applyAutoColonies,
    clearAll,
    findDotAt,
    undo,
    redo,
    exportImage,
    canUndo,
    canRedo,
    colonyCount,
    dilutionMode,
    setDilutionMode,
    dilutionExponent,
    setDilutionExponent,
    customDilution,
    setCustomDilution,
    volumeMl,
    setVolumeMl,
    sessionName,
    isDirty,
    showSavedFlash,
    saveSession,
    openSession,
    handleSessionFileSelected,
    sessionFileInputRef,
    addPlateFileInputRef,
    handleAddPlateFilesSelected,
    openAddPlatePicker,
    remindSavePulse,
    handleSessionNameChange,
    getSnapshot,
    plates,
    activePlateId,
    switchToPlate,
    renamePlate,
    removePlate,
    goToPrevPlate,
    goToNextPlate,
    canPrevPlate,
    canNextPlate,
    plateMeta,
    updatePlateMeta,
  } = useColonyCounter(instanceId, isActive, initialState);

  const getToolSnapshot = useCallback(
    () => (plates.length > 0 || image ? getSnapshot() : undefined),
    [plates.length, image, getSnapshot]
  );
  useToolSnapshot(instanceId, 'colony-counter', getToolSnapshot);

  const maskKey = activePlateId || 'default';
  const currentMask = masksByPlate[maskKey] || null;
  const maskReady = isMaskComplete(currentMask);

  const setCurrentMask = useCallback(
    (next) => {
      setMasksByPlate((prev) => ({ ...prev, [maskKey]: next }));
      setAutoCountDone(false);
    },
    [maskKey]
  );

  useEffect(() => {
    setDraftPolygon([]);
    setInteractionMode('mark');
    setAutoCountDone(false);
    setAutoCountByType(null);
  }, [activePlateId]);

  useEffect(() => {
    if (interactionMode !== 'mask-polygon') return undefined;
    const onKey = (e) => {
      if (e.key === 'Enter' && draftPolygon.length >= 3) {
        e.preventDefault();
        setCurrentMask({ type: 'polygon', points: [...draftPolygon] });
        setDraftPolygon([]);
        setInteractionMode('mark');
      } else if (e.key === 'Escape') {
        setDraftPolygon([]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [interactionMode, draftPolygon, setCurrentMask]);

  const handleAutoCount = useCallback(async () => {
    if (!image?.src || autoCountBusy) return;
    if (!isAutoCountAvailable()) {
      setAutoCountError('Auto Count is available in the Benchy desktop app only.');
      return;
    }
    if (!maskReady) {
      setAutoCountError('Draw a Mask Area before running Auto Count.');
      setInteractionMode('mask-ellipse');
      return;
    }
    if (dots.length > 0) {
      const ok = window.confirm(
        `Replace ${dots.length} existing marker${dots.length === 1 ? '' : 's'} with Auto Count results?`
      );
      if (!ok) return;
    }
    setAutoCountBusy(true);
    setAutoCountError(null);
    try {
      const result = await requestAutoCount(image.src, currentMask, image.name || 'plate.png');
      applyAutoColonies(result.colonies || []);
      setAutoCountByType(result.countByType || null);
      setAutoCountDone(true);
      setInteractionMode('mark');
    } catch (err) {
      setAutoCountError(err?.message || 'Auto Count failed');
      setAutoCountDone(false);
    } finally {
      setAutoCountBusy(false);
    }
  }, [image, autoCountBusy, dots.length, applyAutoColonies, maskReady, currentMask]);

  const handleSuggestDish = useCallback(async () => {
    if (!image?.src || suggestBusy) return;
    setSuggestBusy(true);
    setAutoCountError(null);
    try {
      const suggestion = await requestSuggestDish(image.src, image.name || 'plate.png');
      if (!suggestion) {
        setAutoCountError('Could not detect a dish edge — draw an ellipse or polygon manually.');
        return;
      }
      setCurrentMask(suggestion);
      setDraftPolygon([]);
      setInteractionMode('mark');
    } catch (err) {
      setAutoCountError(err?.message || 'Dish detection failed');
    } finally {
      setSuggestBusy(false);
    }
  }, [image, suggestBusy, setCurrentMask]);

  const typeHint = useMemo(() => {
    if (!autoCountByType) return null;
    const { yeast = 0, contaminant = 0, uncertain = 0 } = autoCountByType;
    return `Yeast ${yeast} · Contaminant ${contaminant} · Uncertain ${uncertain}`;
  }, [autoCountByType]);

  const plateHint =
    plates.length > 1
      ? `Plate ${(plates.findIndex((p) => p.id === activePlateId) + 1) || 1}/${plates.length} · ${colonyCount} colonies`
      : image
        ? `${colonyCount} colonies`
        : 'Upload one or more plate images to begin';

  return (
    <div className="colony-counter app">
      <IOSInstallBanner />
      <ToolHeader title="Colony Counter">
        <SessionNameEditor
          sessionName={sessionName}
          onSessionNameChange={handleSessionNameChange}
          isDirty={isDirty}
          showSavedFlash={showSavedFlash}
        />
      </ToolHeader>

      <LtTabs
        tabs={CC_TABS}
        activeId={viewTab}
        onChange={setViewTab}
        ariaLabel="Colony Counter views"
      />

      <ToolActionBar hint={typeHint ? `${plateHint} · ${typeHint}` : plateHint}>
        <button
          type="button"
          className={`lt-btn lt-btn--primary${remindSavePulse ? ' cc-save-pulse' : ''}`}
          onClick={saveSession}
          disabled={!image && plates.length === 0}
          title="Export this colony session as a .benchy file (Ctrl+S). Workspace autosave is separate — use Save Project in the top bar."
        >
          Export Session File
        </button>
        <button
          type="button"
          className="lt-btn"
          onClick={openSession}
          title="Open a colony .benchy or legacy .colonycount file (Ctrl+O)"
        >
          Open Session File
        </button>
        <button
          type="button"
          className="lt-btn"
          onClick={openAddPlatePicker}
          title="Add more plate images to this batch"
        >
          Add Plates
        </button>
        <button
          type="button"
          className="lt-btn"
          onClick={exportImage}
          disabled={!image}
          data-tour="cc-export"
          title="Download annotated plate image"
        >
          Save Image
        </button>
        <button
          type="button"
          className={`lt-btn${interactionMode.startsWith('mask') ? ' lt-btn--primary' : ''}`}
          onClick={() => {
            setInteractionMode((m) => (m === 'mask-ellipse' ? 'mark' : 'mask-ellipse'));
            setDraftPolygon([]);
          }}
          disabled={!image}
          title="Draw an ellipse mask over the dish (required before Auto Count)"
        >
          Mask Area
        </button>
        <button
          type="button"
          className={`lt-btn${interactionMode === 'mask-polygon' ? ' lt-btn--primary' : ''}`}
          onClick={() => {
            setInteractionMode((m) => (m === 'mask-polygon' ? 'mark' : 'mask-polygon'));
            setDraftPolygon([]);
          }}
          disabled={!image}
          title="Draw a freehand polygon mask (click points; Enter or click first point to close)"
        >
          Polygon Mask
        </button>
        <button
          type="button"
          className="lt-btn"
          onClick={handleSuggestDish}
          disabled={!image || suggestBusy || !isAutoCountAvailable()}
          title="Suggest a circular dish mask (you can adjust after)"
        >
          {suggestBusy ? 'Detecting…' : 'Detect Dish'}
        </button>
        <button
          type="button"
          className="lt-btn"
          onClick={() => {
            setCurrentMask(null);
            setDraftPolygon([]);
            setAutoCountDone(false);
          }}
          disabled={!image || (!currentMask && !draftPolygon.length)}
          title="Clear counting mask"
        >
          Clear Mask
        </button>
        <button
          type="button"
          className="lt-btn lt-btn--primary"
          onClick={handleAutoCount}
          disabled={!image || autoCountBusy || !maskReady}
          title={
            !isAutoCountAvailable()
              ? 'Auto Count is available in the Benchy desktop app only'
              : !maskReady
                ? 'Draw a Mask Area first'
                : 'Detect colonies inside the mask (desktop)'
          }
        >
          {autoCountBusy ? 'Counting Colonies…' : autoCountDone ? 'Recount' : 'Auto Count'}
        </button>
        <button
          type="button"
          className="lt-btn lt-btn--danger"
          onClick={clearAll}
          disabled={!image}
        >
          Clear All
        </button>
      </ToolActionBar>

      {interactionMode.startsWith('mask') && (
        <div className="cc-mask-hint" role="status">
          {interactionMode === 'mask-ellipse'
            ? 'Drag on the plate to draw an ellipse mask. Auto Count stays disabled until a mask exists.'
            : 'Click to place polygon vertices. Click near the first point or press Enter to close.'}
        </div>
      )}

      {autoCountError && (
        <div className="cc-auto-count-error" role="alert">
          <span>{autoCountError}</span>
          <button type="button" className="lt-btn lt-btn--small" onClick={() => setAutoCountError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <input
        ref={sessionFileInputRef}
        type="file"
        accept=".benchy,.labtools,.colonycount"
        className="cc-hidden-input"
        onChange={handleSessionFileSelected}
      />
      <input
        ref={addPlateFileInputRef}
        type="file"
        accept="image/*,.tif,.tiff"
        multiple
        className="cc-hidden-input"
        onChange={handleAddPlateFilesSelected}
      />

      <div className="app__body app-layout">
        {viewTab === 'summary' ? (
          <div className="cc-batch-summary-wrap">
            <BatchSummary plates={plates} sessionName={sessionName} />
          </div>
        ) : (
          <>
            <Sidebar
              colonyCount={colonyCount}
              categories={categories}
              activeCategory={activeCategory}
              categoryCounts={categoryCounts}
              dots={dots}
              onSelectCategory={setActiveCategory}
              onUpdateCategoryLabel={updateCategoryLabel}
              onUpdateCategoryColor={updateCategoryColor}
              onAddCategory={addCategory}
              onDeleteCategory={deleteCategory}
              dilutionMode={dilutionMode}
              setDilutionMode={setDilutionMode}
              dilutionExponent={dilutionExponent}
              setDilutionExponent={setDilutionExponent}
              customDilution={customDilution}
              setCustomDilution={setCustomDilution}
              volumeMl={volumeMl}
              setVolumeMl={setVolumeMl}
              dotRadius={dotRadius}
              setDotRadius={setDotRadius}
              opacity={opacity}
              setOpacity={setOpacity}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              hasImage={!!image}
              plateMeta={plateMeta}
              onPlateMetaChange={updatePlateMeta}
              plateCount={plates.length}
            />
            <div className="workspace-area">
              <Workspace
                image={image}
                loadingImage={loadingImage}
                loadingLabel={loadingLabel}
                uploadError={uploadError}
                onDismissUploadError={dismissUploadError}
                dots={dots}
                opacity={opacity}
                onUpload={addPlatesFromFiles}
                onAddDot={addDot}
                onRemoveDot={removeDot}
                onMoveDot={moveDot}
                findDotAt={findDotAt}
                activePlateId={activePlateId}
                plates={plates}
                onSelectPlate={switchToPlate}
                onRenamePlate={renamePlate}
                onRemovePlate={removePlate}
                onPrevPlate={goToPrevPlate}
                onNextPlate={goToNextPlate}
                onAddPlates={openAddPlatePicker}
                canPrevPlate={canPrevPlate}
                canNextPlate={canNextPlate}
                isActive={isActive}
                interactionMode={interactionMode}
                mask={currentMask}
                draftPolygon={draftPolygon}
                onMaskChange={setCurrentMask}
                onDraftPolygonChange={setDraftPolygon}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
