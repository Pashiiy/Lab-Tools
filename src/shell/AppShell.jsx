import { useState, useCallback, useMemo } from 'react';
import HomePage from './HomePage';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import SettingsPanel from './SettingsPanel';
import SessionRecoveryPrompt from './SessionRecoveryPrompt';
import { useTabManager } from './useTabManager';
import { useWorkspaceSession } from './useWorkspaceSession';
import { useGlobalTheme } from '../shared/useGlobalTheme';
import { useToolPreferences } from './useToolPreferences';
import { TOOLS } from './toolRegistry';
import GlobalDrawer from '../shared/GlobalDrawer';
import NotepadPanel from '../shared/NotepadPanel';
import StrainReferencePanel from '../shared/StrainReferencePanel';
import ToolOnboardingShell from '../help/ToolOnboardingShell';
import { ToolHelpProvider } from '../help/ToolHelpContext';
import './shell.css';

export default function AppShell() {
  const { theme, setTheme, toggleTheme } = useGlobalTheme();
  const toolPrefs = useToolPreferences();
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [strainOpen, setStrainOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleToolOpened = useCallback(
    (toolId) => toolPrefs.recordRecent(toolId),
    [toolPrefs.recordRecent]
  );

  const tabManager = useTabManager({ onToolOpened: handleToolOpened });
  const {
    tabs,
    tabLabels,
    activeTabId,
    view,
    openTool,
    selectTab,
    closeTab,
    goHome,
  } = tabManager;

  const session = useWorkspaceSession({ tabManager, theme, setTheme, openTool });

  const activeToolId = useMemo(() => {
    if (view !== 'tool' || !activeTabId) return null;
    return tabs.find((t) => t.id === activeTabId)?.toolId ?? null;
  }, [view, activeTabId, tabs]);

  const toggleNotepad = () => {
    setNotepadOpen((v) => !v);
    if (!notepadOpen) {
      setStrainOpen(false);
      setSettingsOpen(false);
    }
  };

  const toggleStrain = () => {
    setStrainOpen((v) => !v);
    if (!strainOpen) {
      setNotepadOpen(false);
      setSettingsOpen(false);
    }
  };

  const openSettings = () => {
    setSettingsOpen(true);
    setNotepadOpen(false);
    setStrainOpen(false);
  };

  return (
    <div className={`shell${view === 'home' ? ' shell--home' : ' shell--tool'}`}>
      <Sidebar
        view={view}
        activeToolId={activeToolId}
        onGoHome={goHome}
        onOpenTool={openTool}
        recentProjects={session.recentProjects}
        recentFiles={session.recentFiles}
        onOpenRecentProject={session.openRecentProject}
        onOpenRecentFile={session.openRecentFile}
        onImportProject={session.importProject}
      />

      <div className="shell-main">
        <ToolHelpProvider>
        <TopBar
          theme={theme}
          onToggleTheme={toggleTheme}
          tabs={tabs}
          tabLabels={tabLabels}
          activeTabId={activeTabId}
          onSelectTab={selectTab}
          onCloseTab={closeTab}
          onOpenTool={openTool}
          notepadOpen={notepadOpen}
          strainOpen={strainOpen}
          onToggleNotepad={toggleNotepad}
          onToggleStrain={toggleStrain}
          view={view}
          activeToolId={activeToolId}
          onSaveProject={session.saveNamedProject}
          onExportProject={session.exportProject}
          onImportProject={session.importProject}
          onOpenSettings={openSettings}
          lastSavedAt={session.lastSavedAt}
        />

        <div className={`shell-content${view === 'home' ? ' shell-content--home' : ' shell-content--tool'}`}>
          {session.recoveryProject && (
            <SessionRecoveryPrompt
              project={session.recoveryProject}
              onRestore={session.applyRecovery}
              onDismiss={session.dismissRecovery}
            />
          )}
          {view === 'home' && (
            <HomePage
              onOpenTool={openTool}
              favorites={toolPrefs.favorites}
              recent={toolPrefs.recent}
              onToggleFavorite={toolPrefs.toggleFavorite}
              isFavorite={toolPrefs.isFavorite}
              recentProjects={session.recentProjects}
              onOpenRecentProject={session.openRecentProject}
              onRenameRecentProject={session.renameRecent}
              onDeleteRecentProject={session.deleteRecent}
              onImportProject={session.importProject}
              recentFiles={session.recentFiles}
              onOpenRecentFile={session.openRecentFile}
              onRemoveRecentFile={session.removeRecentFileEntry}
              onClearRecentFiles={session.clearAllRecentFiles}
            />
          )}

          {tabs.map((tab) => {
            const ToolComponent = TOOLS[tab.toolId]?.component;
            if (!ToolComponent) return null;

            const isVisible = view === 'tool' && activeTabId === tab.id;

            return (
            <div
              key={tab.id}
              className={`shell-tab-panel${isVisible ? ' shell-tab-panel--active' : ''}`}
              role="tabpanel"
              aria-hidden={!isVisible}
              style={{ display: isVisible ? 'flex' : 'none' }}
            >
                <ToolOnboardingShell toolId={tab.toolId} isActive={isVisible}>
                  <ToolComponent
                    instanceId={tab.id}
                    isActive={isVisible}
                    initialState={tab.initialState ?? null}
                  />
                </ToolOnboardingShell>
              </div>
            );
          })}
        </div>
        </ToolHelpProvider>
      </div>

      <GlobalDrawer
        open={notepadOpen}
        onClose={() => setNotepadOpen(false)}
        title="Lab Notepad"
        subtitle="Notes & calculators"
        width={380}
      >
        <NotepadPanel />
      </GlobalDrawer>

      <GlobalDrawer
        open={strainOpen}
        onClose={() => setStrainOpen(false)}
        title="Strain Reference"
        subtitle="Laboratory strain dictionary"
        width={400}
      >
        <StrainReferencePanel />
      </GlobalDrawer>

      <GlobalDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Settings"
        subtitle="Application preferences"
        width={340}
      >
        <SettingsPanel theme={theme} setTheme={setTheme} />
      </GlobalDrawer>
    </div>
  );
}
