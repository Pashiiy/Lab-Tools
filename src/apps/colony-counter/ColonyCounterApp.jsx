import { useColonyCounter } from './hooks/useColonyCounter';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import RestoreBanner from './components/RestoreBanner';
import IOSInstallBanner from './components/IOSInstallBanner';
import './colony-counter.css';
import '../../shared/image/image-import.css';

export default function ColonyCounterApp({ instanceId, isActive }) {
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
    showRestorePrompt,
    pendingRestore,
    restoreAutosave,
    discardAutosave,
    saveSession,
    openSession,
    handleSessionFileSelected,
    sessionFileInputRef,
    remindSavePulse,
    handleSessionNameChange,
  } = useColonyCounter(instanceId, isActive);

  return (
    <div className="colony-counter app">
      <IOSInstallBanner />
      <Header
        sessionName={sessionName}
        onSessionNameChange={handleSessionNameChange}
        isDirty={isDirty}
        showSavedFlash={showSavedFlash}
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
          onSaveSession={saveSession}
          onOpenSession={openSession}
          onExport={exportImage}
          onClearAll={clearAll}
          hasImage={!!image}
          remindSavePulse={remindSavePulse}
          sessionFileInputRef={sessionFileInputRef}
          onSessionFileSelected={handleSessionFileSelected}
        />
        <div className="workspace-area">
          {showRestorePrompt && pendingRestore && (
            <RestoreBanner
              savedAt={pendingRestore.savedAt}
              onRestore={restoreAutosave}
              onDiscard={discardAutosave}
            />
          )}
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
