import { useColonyCounter } from './hooks/useColonyCounter';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import IOSInstallBanner from './components/IOSInstallBanner';
import SessionNameEditor from './components/SessionNameEditor';
import { useToolSnapshot } from '../../shared/persistence/useToolSnapshot';
import ToolHeader from '../../shared/ui/ToolHeader';
import ToolActionBar from '../../shared/ui/ToolActionBar';
import './colony-counter.css';
import '../../shared/image/image-import.css';

export default function ColonyCounterApp({ instanceId, isActive, initialState = null }) {
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
    uploadError,
    dismissUploadError,
    loadImage,
    addDot,
    removeDot,
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
    remindSavePulse,
    handleSessionNameChange,
    getSnapshot,
  } = useColonyCounter(instanceId, isActive, initialState);

  useToolSnapshot(instanceId, 'colony-counter', () => (image ? getSnapshot() : undefined));

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

      {image && (
        <ToolActionBar hint={`${colonyCount} colonies`}>
          <button
            type="button"
            className={`lt-btn lt-btn--primary${remindSavePulse ? ' cc-save-pulse' : ''}`}
            onClick={saveSession}
            title="Ctrl+S"
          >
            Save Session
          </button>
          <button type="button" className="lt-btn" onClick={openSession} title="Ctrl+O">
            Open Session
          </button>
          <button
            type="button"
            className="lt-btn"
            onClick={exportImage}
            data-tour="cc-export"
          >
            Save Image
          </button>
          <button type="button" className="lt-btn lt-btn--danger" onClick={clearAll}>
            Clear All
          </button>
        </ToolActionBar>
      )}

      <input
        ref={sessionFileInputRef}
        type="file"
        accept=".labtools,.colonycount"
        className="cc-hidden-input"
        onChange={handleSessionFileSelected}
      />

      <div className="app__body app-layout">
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
        />
        <div className="workspace-area">
          <Workspace
            image={image}
            loadingImage={loadingImage}
            uploadError={uploadError}
            onDismissUploadError={dismissUploadError}
            dots={dots}
            opacity={opacity}
            onUpload={loadImage}
            onAddDot={addDot}
            onRemoveDot={removeDot}
            findDotAt={findDotAt}
          />
        </div>
      </div>
    </div>
  );
}
