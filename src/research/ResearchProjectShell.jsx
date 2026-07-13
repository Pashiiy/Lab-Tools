import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createAnalysis,
  createEmptyResearchProject,
  createRun,
  createSample,
  genId,
} from '../shared/persistence/researchProjectSchema';
import {
  autosaveResearchProject,
  loadResearchProject,
  saveResearchProject,
} from '../shared/persistence/researchProjectStore';
import { APP_VERSION } from '../shared/appVersion';
import { TOOLS } from '../shell/toolRegistry';
import { storeFileBlob } from '../shared/persistence/projectStore';
import { windowTitle } from '../shared/brand';
import ProjectToolHost from './ProjectToolHost';
import './research.css';

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'samples', label: 'Samples' },
  { id: 'images', label: 'Images' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'runs', label: 'qPCR Runs' },
  { id: 'notes', label: 'Notes' },
];

const ANALYZE_TOOLS = [
  { id: 'colony-counter', label: 'Colony Counter' },
  { id: 'gel-quantification', label: 'Gel Quantification' },
  { id: 'endpoint-analysis', label: 'Endpoint Analysis' },
];

export default function ResearchProjectShell({ projectId }) {
  const [project, setProject] = useState(null);
  const [section, setSection] = useState('overview');
  const [selected, setSelected] = useState(null); // { type, id, ... }
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const projectRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    const name = project?.metadata?.name;
    document.title = name ? windowTitle(name) : windowTitle('Research Project');
  }, [project?.metadata?.name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!projectId) {
        setError('Missing project id');
        return;
      }
      const loaded = await loadResearchProject(projectId);
      if (cancelled) return;
      if (!loaded) {
        setError('Project not found');
        return;
      }
      setProject(loaded);
      setSection(loaded.session?.ui?.section || 'overview');
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Autosave
  useEffect(() => {
    if (!project || !dirty) return undefined;
    const t = setTimeout(async () => {
      const saved = await autosaveResearchProject(projectRef.current);
      setProject(saved);
      setDirty(false);
    }, 1200);
    return () => clearTimeout(t);
  }, [project, dirty]);

  // Close handshake
  useEffect(() => {
    if (!window.electronAPI?.onClosing) return undefined;
    return window.electronAPI.onClosing(async () => {
      try {
        if (projectRef.current) {
          await autosaveResearchProject(projectRef.current);
        }
      } finally {
        window.electronAPI.confirmClose();
      }
    });
  }, []);

  const updateProject = useCallback((updater) => {
    setProject((prev) => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
    setDirty(true);
  }, []);

  const activeExperiment = project?.hierarchy?.experiments?.[0] ?? null;

  const saveNamed = useCallback(async () => {
    if (!project) return;
    const saved = await saveResearchProject(project);
    setProject(saved);
    setDirty(false);
  }, [project]);

  const exportFile = useCallback(async () => {
    if (!project || !window.electronAPI?.saveProjectFile) return;
    const stamped = await saveResearchProject(project);
    setProject(stamped);
    await window.electronAPI.saveProjectFile(
      stamped.metadata.name || 'research-project',
      JSON.stringify(stamped, null, 2)
    );
    setDirty(false);
  }, [project]);

  const addSample = useCallback(() => {
    updateProject((p) => {
      const experiments = p.hierarchy.experiments.map((exp, i) =>
        i === 0
          ? { ...exp, samples: [...exp.samples, createSample({ name: `Sample ${exp.samples.length + 1}` })] }
          : exp
      );
      return { ...p, hierarchy: { ...p.hierarchy, experiments } };
    });
  }, [updateProject]);

  const updateSample = useCallback(
    (sampleId, partial) => {
      updateProject((p) => {
        const experiments = p.hierarchy.experiments.map((exp) => ({
          ...exp,
          samples: exp.samples.map((s) => (s.id === sampleId ? { ...s, ...partial } : s)),
        }));
        return { ...p, hierarchy: { ...p.hierarchy, experiments } };
      });
    },
    [updateProject]
  );

  const importImages = useCallback(
    async (files) => {
      const list = [...(files || [])];
      if (!list.length) return;
      const newImages = { ...project.images };
      const unassigned = [...(project.library?.unassignedImageIds || [])];
      for (const file of list) {
        const id = genId('img');
        const blobRef = `research-img-${id}`;
        await storeFileBlob(blobRef, file);
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newImages[id] = {
          id,
          name: file.name,
          blobRef,
          dataUrl,
          folderId: null,
          sampleId: null,
          analyses: [],
          addedAt: new Date().toISOString(),
        };
        unassigned.push(id);
      }
      updateProject((p) => ({
        ...p,
        images: newImages,
        library: { ...p.library, unassignedImageIds: unassigned },
      }));
    },
    [project, updateProject]
  );

  const assignImageToSample = useCallback(
    (imageId, sampleId) => {
      updateProject((p) => {
        const img = p.images[imageId];
        if (!img) return p;
        const experiments = p.hierarchy.experiments.map((exp) => ({
          ...exp,
          samples: exp.samples.map((s) => {
            let imageIds = s.imageIds || [];
            if (s.id === sampleId && !imageIds.includes(imageId)) {
              imageIds = [...imageIds, imageId];
            }
            if (s.id !== sampleId) {
              imageIds = imageIds.filter((id) => id !== imageId);
            }
            return { ...s, imageIds };
          }),
        }));
        return {
          ...p,
          hierarchy: { ...p.hierarchy, experiments },
          images: {
            ...p.images,
            [imageId]: { ...img, sampleId },
          },
          library: {
            ...p.library,
            unassignedImageIds: (p.library.unassignedImageIds || []).filter((id) => id !== imageId),
          },
        };
      });
    },
    [updateProject]
  );

  const startAnalysis = useCallback(
    (imageId, toolId) => {
      const img = project.images[imageId];
      const existing = (img?.analyses || []).find((a) => a.toolId === toolId);
      // MVP: one mutable analysis per tool per image — reopen if present
      if (existing) {
        setSelected({
          type: 'analysis',
          imageId,
          analysisId: existing.id,
          toolId,
        });
        setSection('analysis');
        return;
      }

      const analysis = createAnalysis({
        toolId,
        label: `${TOOLS[toolId]?.name || toolId}`,
        state: null,
      });
      if (toolId === 'colony-counter' && img?.dataUrl) {
        analysis.state = {
          version: 2,
          sessionName: project.metadata.name,
          activePlateId: 'plate-1',
          categories: null,
          plates: [
            {
              id: 'plate-1',
              name: img.name,
              imageName: img.name,
              imageData: img.dataUrl,
              originalSrc: img.dataUrl,
              dots: [],
              activeCategory: 'cat-1',
              dotRadius: 12,
              opacity: 0.7,
              cfu: {
                dilutionMode: 'preset',
                dilutionExponent: -1,
                customDilution: null,
                volumeMl: 0.1,
              },
              sampleName: img.name.replace(/\.[^.]+$/, ''),
              notes: '',
              date: new Date().toISOString().slice(0, 10),
              strain: '',
              treatment: '',
              timePoint: '',
              replicate: '',
            },
          ],
        };
      }
      updateProject((p) => ({
        ...p,
        images: {
          ...p.images,
          [imageId]: {
            ...p.images[imageId],
            analyses: [...(p.images[imageId].analyses || []), analysis],
          },
        },
      }));
      setSelected({ type: 'analysis', imageId, analysisId: analysis.id, toolId });
      setSection('analysis');
    },
    [project, updateProject]
  );

  const saveAnalysisState = useCallback(
    (imageId, analysisId, state) => {
      updateProject((p) => ({
        ...p,
        images: {
          ...p.images,
          [imageId]: {
            ...p.images[imageId],
            analyses: (p.images[imageId].analyses || []).map((a) =>
              a.id === analysisId
                ? { ...a, state, updatedAt: new Date().toISOString(), status: 'draft' }
                : a
            ),
          },
        },
      }));
    },
    [updateProject]
  );

  const addQPCRRun = useCallback(() => {
    const run = createRun({ label: `qPCR Run ${(project.runs?.length || 0) + 1}` });
    updateProject((p) => ({ ...p, runs: [...(p.runs || []), run] }));
    setSelected({ type: 'run', runId: run.id, toolId: 'qpcr-analyzer' });
    setSection('runs');
  }, [project, updateProject]);

  const saveRunState = useCallback(
    (runId, state) => {
      updateProject((p) => ({
        ...p,
        runs: (p.runs || []).map((r) =>
          r.id === runId ? { ...r, state, updatedAt: new Date().toISOString() } : r
        ),
      }));
    },
    [updateProject]
  );

  const allSamples = useMemo(
    () => activeExperiment?.samples || [],
    [activeExperiment]
  );

  if (error) {
    return (
      <div className="research-shell research-shell--error">
        <h1>Unable to open project</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="research-shell research-shell--loading">
        <p>Loading research project…</p>
      </div>
    );
  }

  const activeAnalysis =
    selected?.type === 'analysis'
      ? project.images[selected.imageId]?.analyses?.find((a) => a.id === selected.analysisId)
      : null;
  const activeRun =
    selected?.type === 'run'
      ? (project.runs || []).find((r) => r.id === selected.runId)
      : null;

  return (
    <div className="research-shell">
      <header className="research-topbar">
        <div className="research-topbar__title">
          <span className="research-topbar__badge">Research</span>
          <h1>{project.metadata.name}</h1>
          {dirty && <span className="research-topbar__dirty">Unsaved</span>}
        </div>
        <div className="research-topbar__actions">
          <button type="button" className="lt-btn" onClick={saveNamed}>
            Save
          </button>
          <button type="button" className="lt-btn lt-btn--primary" onClick={exportFile}>
            Export
          </button>
        </div>
      </header>

      <div className="research-body">
        <nav className="research-nav" aria-label="Project sections">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`research-nav__item${section === item.id ? ' research-nav__item--active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="research-main">
          {section === 'overview' && (
            <div className="research-panel">
              <h2>Overview</h2>
              <dl className="research-meta">
                <div><dt>PI</dt><dd>{project.metadata.pi || '—'}</dd></div>
                <div><dt>Researcher</dt><dd>{project.metadata.researcher || '—'}</dd></div>
                <div><dt>Start</dt><dd>{project.metadata.startDate || '—'}</dd></div>
                <div><dt>Location</dt><dd>{project.metadata.location || '—'}</dd></div>
              </dl>
              <p className="research-desc">{project.metadata.description || 'No description.'}</p>
              <p className="research-stats">
                {allSamples.length} samples · {Object.keys(project.images || {}).length} images ·{' '}
                {(project.runs || []).length} qPCR runs
              </p>
            </div>
          )}

          {section === 'samples' && (
            <div className="research-panel">
              <div className="research-panel__header">
                <h2>Samples</h2>
                <button type="button" className="lt-btn lt-btn--primary" onClick={addSample}>
                  Add Sample
                </button>
              </div>
              {allSamples.length === 0 && <p className="research-empty">No samples yet.</p>}
              <ul className="research-list">
                {allSamples.map((s) => (
                  <li key={s.id} className="research-card">
                    <input
                      className="lt-input"
                      value={s.name}
                      onChange={(e) => updateSample(s.id, { name: e.target.value })}
                    />
                    <div className="research-card__grid">
                      {['strain', 'treatment', 'replicate', 'media', 'operator'].map((field) => (
                        <label key={field}>
                          {field}
                          <input
                            className="lt-input"
                            value={s[field] || ''}
                            onChange={(e) => updateSample(s.id, { [field]: e.target.value })}
                          />
                        </label>
                      ))}
                    </div>
                    <p className="research-card__hint">{(s.imageIds || []).length} images linked</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section === 'images' && (
            <div className="research-panel">
              <div className="research-panel__header">
                <h2>Image Library</h2>
                <button
                  type="button"
                  className="lt-btn lt-btn--primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Import Images
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.tif,.tiff"
                  multiple
                  hidden
                  onChange={(e) => {
                    importImages(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>
              <div className="research-image-grid">
                {Object.values(project.images || {}).map((img) => (
                  <article key={img.id} className="research-image-card">
                    {img.dataUrl ? (
                      <img src={img.dataUrl} alt={img.name} />
                    ) : (
                      <div className="research-image-card__ph">No preview</div>
                    )}
                    <p>{img.name}</p>
                    <label>
                      Sample
                      <select
                        className="lt-input"
                        value={img.sampleId || ''}
                        onChange={(e) => assignImageToSample(img.id, e.target.value || null)}
                      >
                        <option value="">Unassigned</option>
                        {allSamples.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="research-image-card__tools">
                      {ANALYZE_TOOLS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="lt-btn lt-btn--small"
                          onClick={() => startAnalysis(img.id, t.id)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {(img.analyses || []).length > 0 && (
                      <ul className="research-analysis-links">
                        {img.analyses.map((a) => (
                          <li key={a.id}>
                            <button
                              type="button"
                              className="lt-btn lt-btn--small"
                              onClick={() => {
                                setSelected({
                                  type: 'analysis',
                                  imageId: img.id,
                                  analysisId: a.id,
                                  toolId: a.toolId,
                                });
                                setSection('analysis');
                              }}
                            >
                              Open {a.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}

          {section === 'analysis' && (
            <div className="research-panel research-panel--tool">
              {!activeAnalysis ? (
                <p className="research-empty">
                  Select an image and choose a tool under Images to start an analysis.
                </p>
              ) : (
                <ProjectToolHost
                  key={activeAnalysis.id}
                  toolId={activeAnalysis.toolId}
                  instanceId={activeAnalysis.id}
                  initialState={activeAnalysis.state}
                  onStateChange={(state) =>
                    saveAnalysisState(selected.imageId, selected.analysisId, state)
                  }
                />
              )}
            </div>
          )}

          {section === 'runs' && (
            <div className="research-panel research-panel--tool">
              <div className="research-panel__header">
                <h2>qPCR Runs</h2>
                <button type="button" className="lt-btn lt-btn--primary" onClick={addQPCRRun}>
                  New Run
                </button>
              </div>
              <ul className="research-list research-list--compact">
                {(project.runs || []).map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`lt-btn${selected?.runId === r.id ? ' lt-btn--active' : ''}`}
                      onClick={() =>
                        setSelected({ type: 'run', runId: r.id, toolId: r.toolId })
                      }
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
              {activeRun ? (
                <ProjectToolHost
                  key={activeRun.id}
                  toolId={activeRun.toolId}
                  instanceId={activeRun.id}
                  initialState={activeRun.state}
                  onStateChange={(state) => saveRunState(activeRun.id, state)}
                />
              ) : (
                <p className="research-empty">Create or select a qPCR run.</p>
              )}
            </div>
          )}

          {section === 'notes' && (
            <div className="research-panel">
              <h2>Notes</h2>
              <textarea
                className="lt-input research-notes"
                rows={16}
                value={project.metadata.notes || ''}
                onChange={(e) =>
                  updateProject((p) => ({
                    ...p,
                    metadata: { ...p.metadata, notes: e.target.value },
                  }))
                }
                placeholder="Project notes…"
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/** Used by dashboard to create + open a project window */
export async function createAndOpenResearchProject(fields) {
  const project = createEmptyResearchProject({ ...fields, appVersion: APP_VERSION });
  const saved = await saveResearchProject(project);
  if (window.electronAPI?.openResearchWindow) {
    await window.electronAPI.openResearchWindow(saved.metadata.id);
  }
  return saved;
}
