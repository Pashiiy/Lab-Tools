/**
 * Persistence foundation tests (no framework): `npm run test:persistence`.
 *
 * Covers the unified `.labtools` schema, legacy `.colonycount` migration, the
 * tool-state registry round-trip, recent-files/projects logic, and the full
 * projectStore save/load/recover flow against an in-memory backend (the same
 * interface the IndexedDB and Electron backends implement).
 */
import {
  createEmptyProject,
  validateProject,
  isLabtoolsProject,
  isLegacyColonyCounter,
  migrateLegacyColonyCounter,
  serializeProject,
  deserializeProject,
  touchProject,
} from '../labtoolsSchema.js';
import {
  registerToolPersistence,
  serializeToolState,
  deserializeToolState,
  _resetRegistry,
} from '../toolStateRegistry.js';
import {
  addRecentFile,
  removeRecent,
  addRecentProject,
  renameRecentProject,
  removeRecentProject,
} from '../recentStore.js';
import {
  markCleanExit,
  consumeCleanExitFlag,
  markCrashSession,
} from '../sessionLifecycle.js';
import { createInMemoryBackend, setStorageBackend } from '../storageBackend.js';
import * as store from '../projectStore.js';

let passed = 0;
let failed = 0;
function assert(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.error(`  \u2717 ${name}${detail ? `  — ${detail}` : ''}`); }
}

async function run() {
  console.log('\nPersistence foundation\n');

  console.log('Schema');
  {
    const p = createEmptyProject({ name: 'My Run', appVersion: '1.2.3' });
    assert('createEmptyProject is a valid project', validateProject(p).valid);
    assert('is recognized as labtools', isLabtoolsProject(p));
    assert('round-trips through serialize/deserialize', (() => {
      const back = deserializeProject(serializeProject(p));
      return back.metadata.id === p.metadata.id && back.metadata.name === 'My Run';
    })());
    assert('invalid object fails validation', !validateProject({ foo: 1 }).valid);
    assert('touchProject updates lastModifiedAt', (() => {
      const t = touchProject(p, 'manual');
      return t.metadata.lastModifiedAt >= p.metadata.lastModifiedAt && t.session.reason === 'manual';
    })());
  }

  console.log('\nLegacy .colonycount migration');
  {
    const legacy = {
      version: 1,
      savedAt: '2024-01-01T00:00:00.000Z',
      imageName: 'plate.tif',
      imageData: 'data:image/png;base64,AAAA',
      dots: [{ id: 1, x: 10, y: 20 }],
      categories: [{ id: 'cat-1', label: 'wt', color: '#fff' }],
    };
    assert('detects legacy colony file', isLegacyColonyCounter(legacy));
    assert('does not flag a labtools file as legacy', !isLegacyColonyCounter(createEmptyProject()));
    const proj = migrateLegacyColonyCounter(legacy, { appVersion: '1.0.0' });
    assert('migration yields valid project', validateProject(proj).valid);
    assert('migration creates one colony-counter tab', proj.workspace.tabs.length === 1 && proj.workspace.tabs[0].toolId === 'colony-counter');
    assert('migration preserves dots in tool state', proj.tools[proj.workspace.activeTabId].state.dots.length === 1);
    assert('deserializeProject auto-migrates legacy text', (() => {
      const back = deserializeProject(JSON.stringify(legacy));
      return isLabtoolsProject(back) && back.tools[back.workspace.activeTabId].toolId === 'colony-counter';
    })());
    let threw = false;
    try { deserializeProject('{"foo":1}'); } catch { threw = true; }
    assert('unrecognized content throws', threw);
  }

  console.log('\nTool state registry');
  {
    _resetRegistry();
    registerToolPersistence('demo-tool', {
      version: 2,
      serialize: (live) => ({ count: live.count, label: live.label }),
      deserialize: (state) => ({ count: state.count, label: state.label, hydrated: true }),
      migrate: (state, from) => (from < 2 ? { ...state, label: state.label ?? 'legacy' } : state),
    });
    const entry = serializeToolState('demo-tool', { count: 5, label: 'A', fn: () => {} });
    assert('serialize strips non-data and tags version', entry.stateVersion === 2 && entry.state.count === 5 && !('fn' in entry.state));
    const live = deserializeToolState(entry);
    assert('deserialize restores live state', live.count === 5 && live.hydrated === true);
    const migrated = deserializeToolState({ toolId: 'demo-tool', stateVersion: 1, state: { count: 1 } });
    assert('older stateVersion runs migrate', migrated.label === 'legacy' && migrated.count === 1);
    assert('unknown tool returns null', serializeToolState('nope', {}) === null);
  }

  console.log('\nRecent files / projects logic');
  {
    let files = [];
    files = addRecentFile(files, { name: 'a.tif', type: 'tiff', toolId: 'gel-quantification' });
    files = addRecentFile(files, { name: 'b.csv', type: 'csv', toolId: 'qpcr-analyzer' });
    files = addRecentFile(files, { name: 'a.tif', type: 'tiff', toolId: 'gel-quantification' });
    assert('recent files dedupe + move to top', files.length === 2 && files[0].name === 'a.tif');
    files = removeRecent(files, files[0].id);
    assert('remove recent file', files.length === 1 && files[0].name === 'b.csv');
    assert('respects limit', addRecentFileMany(50).length === 40);

    let projs = [];
    projs = addRecentProject(projs, { projectId: 'p1', name: 'One', lastModifiedAt: '2024-01-01T00:00:00Z' });
    projs = addRecentProject(projs, { projectId: 'p2', name: 'Two', lastModifiedAt: '2024-02-01T00:00:00Z' });
    assert('recent projects sort newest first', projs[0].projectId === 'p2');
    projs = renameRecentProject(projs, 'p1', 'One-renamed');
    assert('rename recent project', projs.find((p) => p.projectId === 'p1').name === 'One-renamed');
    projs = removeRecentProject(projs, 'p2');
    assert('remove recent project', projs.length === 1 && projs[0].projectId === 'p1');
  }

  console.log('\nprojectStore end-to-end (in-memory backend)');
  {
    setStorageBackend(createInMemoryBackend());

    // Session restore.
    const live = createEmptyProject({ name: 'Session', appVersion: '1.0.0' });
    await store.saveCurrentSession(live, 'autosave');
    const restored = await store.loadCurrentSession();
    assert('current session restored', restored && restored.metadata.id === live.metadata.id);
    await store.clearCurrentSession();
    assert('current session cleared', (await store.loadCurrentSession()) === null);

    // Named project save/load + recent.
    const proj = createEmptyProject({ name: 'Project A', appVersion: '1.0.0' });
    proj.workspace.tabs = [{ id: 'tab-1', toolId: 'gel-quantification', label: 'Gel (1)' }];
    proj.tools['tab-1'] = { toolId: 'gel-quantification', stateVersion: 1, state: { ok: true } };
    await store.saveProject(proj);
    const recents = await store.listRecentProjects();
    assert('saved project appears in recents', recents.some((r) => r.projectId === proj.metadata.id));
    assert('recent carries tool ids', recents[0].toolIds.includes('gel-quantification'));
    const loaded = await store.loadProject(proj.metadata.id);
    assert('named project loads with tool state', loaded.tools['tab-1'].state.ok === true);

    // Rename + delete.
    await store.renameProject(proj.metadata.id, 'Renamed');
    const afterRename = await store.loadProject(proj.metadata.id);
    assert('project rename persists', afterRename.metadata.name === 'Renamed');
    await store.deleteProject(proj.metadata.id);
    assert('project deleted', (await store.loadProject(proj.metadata.id)) === null);
    assert('recents updated after delete', !(await store.listRecentProjects()).some((r) => r.projectId === proj.metadata.id));

    // Recent files via store.
    await store.recordRecentFile({ name: 'gel.tif', type: 'tiff', toolId: 'gel-quantification' });
    assert('recordRecentFile persists', (await store.listRecentFiles()).length === 1);
    await store.clearRecentFiles();
    assert('clearRecentFiles empties list', (await store.listRecentFiles()).length === 0);

    // Blob store.
    await store.storeFileBlob('file-1', { bytes: 42 });
    assert('blob stored and retrieved', (await store.getFileBlob('file-1')).bytes === 42);
    await store.deleteFileBlob('file-1');
    assert('blob deleted', (await store.getFileBlob('file-1')) === null);

    // Settings.
    await store.setGlobalSettings({ theme: 'dark' });
    assert('settings persist', (await store.getGlobalSettings()).theme === 'dark');
  }

  console.log('\nSession lifecycle (clean exit vs crash)');
  {
    if (typeof sessionStorage !== 'undefined') {
      markCleanExit();
      assert('clean exit flag consumed once', consumeCleanExitFlag() === true);
      assert('flag absent after consume', consumeCleanExitFlag() === false);
    } else {
      assert('sessionStorage unavailable in Node — skip flag test', true);
    }

    const p = createEmptyProject({ name: 'Crash', appVersion: '1.0.0' });
    const crashed = markCrashSession(p);
    assert('crash session tagged', crashed.session.reason === 'crash');
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

function addRecentFileMany(n) {
  let list = [];
  for (let i = 0; i < n; i++) {
    list = addRecentFile(list, { name: `f${i}.csv`, type: 'csv', toolId: 't' });
  }
  return list;
}

run();
