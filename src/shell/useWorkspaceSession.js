import { useCallback, useEffect, useRef, useState } from 'react';
import { APP_VERSION } from '../shared/appVersion';
import { createEmptyProject } from '../shared/persistence/labtoolsSchema.js';
import { collectToolStates, subscribeToolChange } from '../shared/persistence/toolSnapshotRegistry.js';
import {
  saveCurrentSession,
  loadCurrentSession,
  clearCurrentSession,
  saveProject,
  loadProject,
  deleteProject,
  renameProject,
  listRecentProjects,
  listRecentFiles,
  removeRecentFile,
  clearRecentFiles,
  getFileBlob,
  importProjectFromText,
} from '../shared/persistence/projectStore.js';
import { downloadText, pickTextFile } from '../shared/persistence/fileDialog.js';
import { LABTOOLS_EXTENSION } from '../shared/persistence/labtoolsSchema.js';
import { registerCloseFlush } from '../shared/electronCloseHandler';
import {
  markCleanExit,
  consumeCleanExitFlag,
  markCrashSession,
} from '../shared/persistence/sessionLifecycle.js';
import { reopenRecentFileEntry } from '../shared/persistence/trackRecentFile.js';

const AUTOSAVE_DEBOUNCE_MS = 1500;
const AUTOSAVE_INTERVAL_MS = 30000;

/**
 * Orchestrates persistent sessions for the whole workspace:
 * load on startup → auto-restore or crash recovery → autosave continuously →
 * export/import unified `.labtools` projects → manage recent files & projects.
 */
export function useWorkspaceSession({ tabManager, theme, setTheme, openTool }) {
  const { tabs, activeTabId, tabLabels, restoreWorkspace, view } = tabManager;

  const projectIdRef = useRef(null);
  const projectNameRef = useRef('Workspace');
  const [recoveryProject, setRecoveryProject] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [changeTick, setChangeTick] = useState(0);
  const restoredRef = useRef(false);

  const refreshRecents = useCallback(async () => {
    setRecentProjects(await listRecentProjects());
    setRecentFiles(await listRecentFiles());
  }, []);

  const buildProject = useCallback(() => {
    const base = createEmptyProject({ name: projectNameRef.current, appVersion: APP_VERSION });
    if (projectIdRef.current) base.metadata.id = projectIdRef.current;
    else projectIdRef.current = base.metadata.id;

    base.workspace = {
      tabs: tabs.map((t) => ({ id: t.id, toolId: t.toolId, label: tabLabels[t.id] ?? t.toolName })),
      activeTabId: view === 'tool' ? activeTabId : null,
    };
    base.tools = collectToolStates();
    base.settings = { theme };
    return base;
  }, [tabs, activeTabId, tabLabels, theme, view]);

  const buildProjectRef = useRef(buildProject);
  buildProjectRef.current = buildProject;

  /* ----------------------------- Startup load ----------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await loadCurrentSession();
      await refreshRecents();
      if (cancelled || !existing?.workspace?.tabs?.length) return;

      projectIdRef.current = existing.metadata.id;
      projectNameRef.current = existing.metadata.name;

      const wasCleanExit = consumeCleanExitFlag();
      const isCrash =
        !wasCleanExit ||
        existing.session?.reason === 'crash';

      if (isCrash) {
        setRecoveryProject(markCrashSession(existing));
        return;
      }

      // Normal refresh / reopen → restore silently (VS Code behaviour).
      restoredRef.current = true;
      restoreWorkspace(existing.workspace, existing.tools ?? {});
      if (existing.settings?.theme) setTheme(existing.settings.theme);
    })();
    return () => { cancelled = true; };
  }, [refreshRecents, restoreWorkspace, setTheme]);

  /* ------------------------------- Autosave -------------------------------- */
  const doAutosave = useCallback(async (reason) => {
    if (recoveryProject && !restoredRef.current) return;
    const project = buildProjectRef.current();
    await saveCurrentSession(project, reason);
    setLastSavedAt(Date.now());
  }, [recoveryProject]);

  // Tool state changes (via useToolSnapshot → notifyToolChange).
  useEffect(() => {
    return subscribeToolChange(() => setChangeTick((n) => n + 1));
  }, []);

  useEffect(() => {
    if (recoveryProject && !restoredRef.current) return undefined;
    const t = setTimeout(() => { doAutosave('change'); }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [tabs, activeTabId, theme, view, changeTick, recoveryProject, doAutosave]);

  useEffect(() => {
    const id = setInterval(() => { doAutosave('interval'); }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [doAutosave]);

  useEffect(() => {
    const onBeforeUnload = () => {
      markCleanExit();
      doAutosave('beforeunload');
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        markCleanExit();
        doAutosave('hidden');
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    const detachElectron = registerCloseFlush(async () => {
      markCleanExit();
      await doAutosave('app-closing');
    });
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
      detachElectron?.();
    };
  }, [doAutosave]);

  /* ------------------------------- Recovery -------------------------------- */
  const applyRecovery = useCallback(() => {
    if (!recoveryProject) return;
    restoredRef.current = true;
    restoreWorkspace(recoveryProject.workspace, recoveryProject.tools ?? {});
    if (recoveryProject.settings?.theme) setTheme(recoveryProject.settings.theme);
    setRecoveryProject(null);
  }, [recoveryProject, restoreWorkspace, setTheme]);

  const dismissRecovery = useCallback(async () => {
    setRecoveryProject(null);
    projectIdRef.current = null;
    await clearCurrentSession();
  }, []);

  /* --------------------------- Projects (recents) -------------------------- */
  const openRecentProject = useCallback(async (projectId) => {
    const project = await loadProject(projectId);
    if (!project) return;
    restoredRef.current = true;
    projectIdRef.current = project.metadata.id;
    projectNameRef.current = project.metadata.name;
    restoreWorkspace(project.workspace, project.tools ?? {});
    if (project.settings?.theme) setTheme(project.settings.theme);
    setRecoveryProject(null);
  }, [restoreWorkspace, setTheme]);

  const saveNamedProject = useCallback(async (name) => {
    const project = buildProjectRef.current();
    if (name) { project.metadata.name = name; projectNameRef.current = name; }
    const saved = await saveProject(project);
    projectIdRef.current = saved.metadata.id;
    await refreshRecents();
    return saved;
  }, [refreshRecents]);

  const renameRecent = useCallback(async (projectId, name) => {
    await renameProject(projectId, name);
    if (projectId === projectIdRef.current) projectNameRef.current = name;
    await refreshRecents();
  }, [refreshRecents]);

  const deleteRecent = useCallback(async (projectId) => {
    await deleteProject(projectId);
    await refreshRecents();
  }, [refreshRecents]);

  /* ------------------------------ Recent files ----------------------------- */
  const removeRecentFileEntry = useCallback(async (id) => {
    await removeRecentFile(id);
    await refreshRecents();
  }, [refreshRecents]);

  const clearAllRecentFiles = useCallback(async () => {
    await clearRecentFiles();
    await refreshRecents();
  }, [refreshRecents]);

  const openRecentFile = useCallback(async (entry) => {
    try {
      await reopenRecentFileEntry(entry, { getFileBlob, openTool });
      await refreshRecents();
    } catch (err) {
      alert(err.message || 'Could not reopen file.');
    }
  }, [openTool, refreshRecents]);

  /* ------------------------------ Export / import -------------------------- */
  const exportProject = useCallback(async () => {
    const project = buildProjectRef.current();
    const json = JSON.stringify(project, null, 2);
    const filename = `${(projectNameRef.current || 'workspace').replace(/[^\w.-]+/g, '_')}.${LABTOOLS_EXTENSION}`;
    await downloadText(json, filename);
  }, []);

  const importProject = useCallback(async () => {
    const text = await pickTextFile([`.${LABTOOLS_EXTENSION}`, '.colonycount', '.json']);
    if (!text) return;
    const project = importProjectFromText(text, { appVersion: APP_VERSION });
    restoredRef.current = true;
    projectIdRef.current = project.metadata.id;
    projectNameRef.current = project.metadata.name;
    restoreWorkspace(project.workspace, project.tools ?? {});
    if (project.settings?.theme) setTheme(project.settings.theme);
    setRecoveryProject(null);
    await refreshRecents();
  }, [restoreWorkspace, setTheme, refreshRecents]);

  return {
    recoveryProject,
    applyRecovery,
    dismissRecovery,
    recentProjects,
    recentFiles,
    openRecentProject,
    openRecentFile,
    removeRecentFileEntry,
    clearAllRecentFiles,
    saveNamedProject,
    renameRecent,
    deleteRecent,
    exportProject,
    importProject,
    lastSavedAt,
    projectName: projectNameRef.current,
    refreshRecents,
  };
}
