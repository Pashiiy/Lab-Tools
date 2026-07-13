import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_CATEGORIES,
  createCategory,
  getCategoryCounts,
  ensureTypeCategories,
  categoryForColonyType,
} from '../utils/categories';
import {
  buildBatchSessionObject,
  buildPlateRecord,
  createPlateId,
  defaultPlateMeta,
  deserializeCfu,
  migrateSession,
  syncDotIdCounterAcrossPlates,
  validateSession,
} from '../utils/session';
import {
  setInstanceDirty,
  clearInstanceDirty,
} from '../../../shared/dirtyStateRegistry';
import { loadImageUniversal } from '../../../shared/image/imageLoader';
import { trackRecentFile } from '../../../shared/persistence/trackRecentFile.js';
import { useOpenFileListener } from '../../../shared/persistence/useOpenFileListener.js';
import { createEmptyProject, isLabtoolsProject } from '../../../shared/persistence/labtoolsSchema.js';
import { isEditableTarget } from '../../../shared/input/isEditableTarget.js';
import { downloadText, pickTextFile } from '../../../shared/persistence/fileDialog.js';
import { importProjectFromText } from '../../../shared/persistence/projectStore.js';
import { APP_VERSION } from '../../../shared/appVersion';

let nextId = 1;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export { hexToRgba };

function encodeOriginalSrc(canvas, cacheRef) {
  if (!canvas) return null;
  const cache = cacheRef.current;
  if (cache.canvas === canvas && cache.dataUrl) return cache.dataUrl;
  const dataUrl = canvas.toDataURL('image/png');
  cacheRef.current = { canvas, dataUrl };
  return dataUrl;
}

export function useColonyCounter(instanceId, isActive = true, initialState = null) {
  const [plates, setPlates] = useState([]);
  const [activePlateId, setActivePlateId] = useState(null);

  // Active-plate live editor state (synced into plates[] on switch / snapshot)
  const [dots, setDots] = useState([]);
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('cat-1');
  const [dotRadius, setDotRadius] = useState(12);
  const [opacity, setOpacity] = useState(0.7);
  const [image, setImage] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Loading image…');
  const [uploadError, setUploadError] = useState(null);
  const [plateMeta, setPlateMeta] = useState(() => defaultPlateMeta());

  const fullResCanvasRef = useRef(null);
  const originalSrcCacheRef = useRef({ canvas: null, dataUrl: null });
  const platesRef = useRef(plates);
  const activePlateIdRef = useRef(activePlateId);
  const liveRef = useRef({});

  const [dilutionMode, setDilutionMode] = useState('preset');
  const [dilutionExponent, setDilutionExponent] = useState(1);
  const [customDilution, setCustomDilution] = useState('');
  const [volumeMl, setVolumeMl] = useState(0.1);

  const [sessionName, setSessionName] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showSavedFlash, setShowSavedFlash] = useState(false);
  const [remindSavePulse, setRemindSavePulse] = useState(false);

  const skipDirtyRef = useRef(false);
  const sessionFileInputRef = useRef(null);
  const addPlateFileInputRef = useRef(null);
  const dirtySinceRef = useRef(null);

  useEffect(() => {
    platesRef.current = plates;
  }, [plates]);
  useEffect(() => {
    activePlateIdRef.current = activePlateId;
  }, [activePlateId]);

  useEffect(() => {
    liveRef.current = {
      image,
      dots,
      categories,
      activeCategory,
      dotRadius,
      opacity,
      dilutionMode,
      dilutionExponent,
      customDilution,
      volumeMl,
      plateMeta,
      sessionName,
    };
  });

  const markDirty = useCallback(() => {
    if (skipDirtyRef.current) return;
    setIsDirty(true);
    if (!dirtySinceRef.current) {
      dirtySinceRef.current = Date.now();
    }
  }, []);

  const activeCat = useMemo(
    () => categories.find((c) => c.id === activeCategory) ?? categories[0],
    [categories, activeCategory]
  );

  const categoryCounts = useMemo(
    () => getCategoryCounts(dots, categories),
    [dots, categories]
  );

  const captureActivePlate = useCallback(() => {
    const live = liveRef.current;
    const id = activePlateIdRef.current;
    if (!id || !live.image) return null;
    const originalSrc = encodeOriginalSrc(fullResCanvasRef.current, originalSrcCacheRef);
    return buildPlateRecord({
      id,
      name: live.plateMeta.sampleName || live.image.name || 'Plate',
      image: live.image,
      dots: live.dots,
      activeCategory: live.activeCategory,
      dotRadius: live.dotRadius,
      opacity: live.opacity,
      dilutionMode: live.dilutionMode,
      dilutionExponent: live.dilutionExponent,
      customDilution: live.customDilution,
      volumeMl: live.volumeMl,
      meta: live.plateMeta,
      originalSrc,
    });
  }, []);

  const syncActiveIntoPlates = useCallback(() => {
    const captured = captureActivePlate();
    if (!captured) return platesRef.current;
    const next = platesRef.current.map((p) => (p.id === captured.id ? captured : p));
    platesRef.current = next;
    setPlates(next);
    return next;
  }, [captureActivePlate]);

  const applyPlateToEditor = useCallback((plate) => {
    skipDirtyRef.current = true;

    const displaySrc = plate.imageData;
    const applyImageState = (displayImg, fullDims) => {
      setImage({
        src: displaySrc,
        naturalWidth: fullDims?.width ?? plate.naturalWidth ?? displayImg.naturalWidth,
        naturalHeight: fullDims?.height ?? plate.naturalHeight ?? displayImg.naturalHeight,
        displayWidth: plate.displayWidth ?? displayImg.naturalWidth,
        displayHeight: plate.displayHeight ?? displayImg.naturalHeight,
        name: plate.imageName,
      });
    };

    if (plate.originalSrc) {
      const fullImg = new Image();
      fullImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = fullImg.naturalWidth;
        canvas.height = fullImg.naturalHeight;
        canvas.getContext('2d').drawImage(fullImg, 0, 0);
        fullResCanvasRef.current = canvas;
        originalSrcCacheRef.current = { canvas, dataUrl: plate.originalSrc };

        const displayImg = new Image();
        displayImg.onload = () => {
          applyImageState(displayImg, {
            width: fullImg.naturalWidth,
            height: fullImg.naturalHeight,
          });
        };
        displayImg.src = displaySrc;
      };
      fullImg.src = plate.originalSrc;
    } else {
      const img = new Image();
      img.onload = () => {
        fullResCanvasRef.current = null;
        originalSrcCacheRef.current = { canvas: null, dataUrl: null };
        applyImageState(img, null);
      };
      img.src = displaySrc;
    }

    const plateDots = plate.dots || [];
    setDots(plateDots);
    setHistory([plateDots]);
    setHistoryIndex(0);
    setActiveCategory(plate.activeCategory || 'cat-1');
    setDotRadius(plate.dotRadius || 12);
    setOpacity(plate.opacity ?? 0.7);

    const cfu = deserializeCfu(plate.cfu);
    setDilutionMode(cfu.dilutionMode);
    setDilutionExponent(cfu.dilutionExponent);
    setCustomDilution(cfu.customDilution);
    setVolumeMl(cfu.volumeMl);

    setPlateMeta(
      defaultPlateMeta({
        sampleName: plate.sampleName || plate.name || '',
        notes: plate.notes || '',
        date: plate.date || new Date().toISOString().slice(0, 10),
        strain: plate.strain || '',
        treatment: plate.treatment || '',
        timePoint: plate.timePoint || '',
        replicate: plate.replicate || '',
      })
    );

    requestAnimationFrame(() => {
      skipDirtyRef.current = false;
    });
  }, []);

  const switchToPlate = useCallback(
    (plateId) => {
      if (!plateId || plateId === activePlateIdRef.current) return;
      syncActiveIntoPlates();
      const plate = platesRef.current.find((p) => p.id === plateId);
      if (!plate?.imageData) return;
      setActivePlateId(plateId);
      activePlateIdRef.current = plateId;
      applyPlateToEditor(plate);
    },
    [syncActiveIntoPlates, applyPlateToEditor]
  );

  const applySession = useCallback(
    (session) => {
      if (!validateSession(session)) {
        alert('This file appears to be corrupted or incompatible.');
        return false;
      }

      const migrated = migrateSession(session);
      skipDirtyRef.current = true;

      const cats = migrated.categories || DEFAULT_CATEGORIES;
      setCategories(cats);
      nextId = syncDotIdCounterAcrossPlates(migrated.plates);

      platesRef.current = migrated.plates;
      setPlates(migrated.plates);

      const activeId =
        migrated.activePlateId && migrated.plates.some((p) => p.id === migrated.activePlateId)
          ? migrated.activePlateId
          : migrated.plates[0].id;
      setActivePlateId(activeId);
      activePlateIdRef.current = activeId;

      setSessionName(migrated.sessionName || 'colony-session');
      setLastSaved(migrated.savedAt ? new Date(migrated.savedAt) : new Date());
      setIsDirty(false);
      dirtySinceRef.current = null;
      setRemindSavePulse(false);

      const active = migrated.plates.find((p) => p.id === activeId);
      if (active) applyPlateToEditor(active);

      requestAnimationFrame(() => {
        skipDirtyRef.current = false;
      });
      return true;
    },
    [applyPlateToEditor]
  );

  const pushHistory = useCallback(
    (newDots) => {
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        return [...trimmed, newDots];
      });
      setHistoryIndex((prev) => prev + 1);
      setDots(newDots);
      markDirty();
    },
    [historyIndex, markDirty]
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setDots(history[newIndex]);
    markDirty();
  }, [history, historyIndex, markDirty]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setDots(history[newIndex]);
    markDirty();
  }, [history, historyIndex, markDirty]);

  const addDot = useCallback(
    (x, y) => {
      if (!activeCat) return;
      const newDot = {
        id: nextId++,
        x,
        y,
        radius: dotRadius,
        color: activeCat.color,
        categoryId: activeCat.id,
        source: 'manual',
        manuallyAdded: true,
        colonyType: 'yeast',
        manuallyEdited: false,
      };
      pushHistory([...dots, newDot]);
    },
    [dots, dotRadius, activeCat, pushHistory]
  );

  const removeDot = useCallback(
    (dotId) => {
      pushHistory(dots.filter((d) => d.id !== dotId));
    },
    [dots, pushHistory]
  );

  const moveDot = useCallback(
    (dotId, x, y) => {
      pushHistory(
        dots.map((d) => (d.id === dotId ? { ...d, x, y, manuallyEdited: true } : d))
      );
    },
    [dots, pushHistory]
  );

  /** Replace active-plate dots with Auto Count results (one history entry). */
  const applyAutoColonies = useCallback(
    (colonies) => {
      const list = Array.isArray(colonies) ? colonies : [];
      setCategories((prev) => ensureTypeCategories(prev));
      const cats = ensureTypeCategories(categories);
      const newDots = list.map((c) => {
        const r = Number(c.radius);
        const colonyType = c.colonyType === 'contaminant' || c.colonyType === 'uncertain'
          ? c.colonyType
          : 'yeast';
        const cat = categoryForColonyType(cats, colonyType) || activeCat;
        if (!cat) return null;
        return {
          id: nextId++,
          x: Number(c.x),
          y: Number(c.y),
          radius: Number.isFinite(r) && r > 0 ? Math.max(3, Math.round(r)) : dotRadius,
          color: cat.color,
          categoryId: cat.id,
          area: c.area ?? null,
          confidence: c.confidence ?? null,
          circularity: c.circularity ?? null,
          source: 'auto',
          manuallyAdded: false,
          colonyType,
          manuallyEdited: false,
        };
      }).filter(Boolean);
      pushHistory(newDots);
      return newDots.length;
    },
    [activeCat, categories, dotRadius, pushHistory]
  );

  const setDotColonyType = useCallback(
    (dotId, colonyType) => {
      const type = colonyType === 'contaminant' || colonyType === 'uncertain' ? colonyType : 'yeast';
      const cats = ensureTypeCategories(categories);
      if (cats !== categories) setCategories(cats);
      const cat = categoryForColonyType(cats, type);
      pushHistory(
        dots.map((d) =>
          d.id === dotId
            ? {
                ...d,
                colonyType: type,
                categoryId: cat?.id || d.categoryId,
                color: cat?.color || d.color,
                manuallyEdited: true,
              }
            : d
        )
      );
    },
    [categories, dots, pushHistory]
  );

  const clearAll = useCallback(() => {
    if (dots.length === 0) return;
    pushHistory([]);
  }, [dots, pushHistory]);

  const updateCategoryLabel = useCallback(
    (id, label) => {
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));
      markDirty();
    },
    [markDirty]
  );

  const updateCategoryColor = useCallback(
    (id, color) => {
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
      markDirty();
    },
    [markDirty]
  );

  const addCategory = useCallback(() => {
    setCategories((prev) => {
      if (prev.length >= 8) return prev;
      const newCat = createCategory(prev);
      setActiveCategory(newCat.id);
      return [...prev, newCat];
    });
    markDirty();
  }, [markDirty]);

  const deleteCategory = useCallback(
    (id) => {
      const synced = syncActiveIntoPlates();
      const hasDots =
        dots.some((d) => d.categoryId === id) ||
        synced.some((p) => (p.dots || []).some((d) => d.categoryId === id));
      if (categories.length <= 1 || hasDots) return;
      setCategories((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeCategory === id) setActiveCategory(next[0].id);
        return next;
      });
      markDirty();
    },
    [categories.length, dots, activeCategory, markDirty, syncActiveIntoPlates]
  );

  const handleSetActiveCategory = useCallback(
    (id) => {
      setActiveCategory(id);
      markDirty();
    },
    [markDirty]
  );

  const handleSetDotRadius = useCallback(
    (value) => {
      setDotRadius(value);
      markDirty();
    },
    [markDirty]
  );

  const handleSetOpacity = useCallback(
    (value) => {
      setOpacity(value);
      markDirty();
    },
    [markDirty]
  );

  const handleSetDilutionMode = useCallback(
    (value) => {
      setDilutionMode(value);
      markDirty();
    },
    [markDirty]
  );

  const handleSetDilutionExponent = useCallback(
    (value) => {
      setDilutionExponent(value);
      markDirty();
    },
    [markDirty]
  );

  const handleSetCustomDilution = useCallback(
    (value) => {
      setCustomDilution(value);
      markDirty();
    },
    [markDirty]
  );

  const handleSetVolumeMl = useCallback(
    (value) => {
      setVolumeMl(value);
      markDirty();
    },
    [markDirty]
  );

  const handleSessionNameChange = useCallback(
    (name) => {
      setSessionName(name);
      markDirty();
    },
    [markDirty]
  );

  const updatePlateMeta = useCallback(
    (partial) => {
      setPlateMeta((prev) => ({ ...prev, ...partial }));
      if (partial.sampleName != null && activePlateIdRef.current) {
        const id = activePlateIdRef.current;
        const name = partial.sampleName.trim() || 'Plate';
        setPlates((prev) =>
          prev.map((p) => (p.id === id ? { ...p, name, sampleName: partial.sampleName } : p))
        );
      }
      markDirty();
    },
    [markDirty]
  );

  const renamePlate = useCallback(
    (plateId, name) => {
      const trimmed = name.trim() || 'Plate';
      setPlates((prev) =>
        prev.map((p) =>
          p.id === plateId ? { ...p, name: trimmed, sampleName: trimmed } : p
        )
      );
      if (plateId === activePlateIdRef.current) {
        setPlateMeta((prev) => ({ ...prev, sampleName: trimmed }));
      }
      markDirty();
    },
    [markDirty]
  );

  const createPlateFromFile = useCallback(async (file) => {
    const result = await loadImageUniversal(file);
    const id = createPlateId();
    const sampleName = file.name.replace(/\.[^/.]+$/, '');
    const plate = buildPlateRecord({
      id,
      name: sampleName,
      image: {
        src: result.displaySrc,
        naturalWidth: result.naturalWidth,
        naturalHeight: result.naturalHeight,
        displayWidth: result.displayWidth,
        displayHeight: result.displayHeight,
        name: result.name,
      },
      dots: [],
      activeCategory: 'cat-1',
      dotRadius: 12,
      opacity: 0.7,
      dilutionMode: 'preset',
      dilutionExponent: 1,
      customDilution: '',
      volumeMl: 0.1,
      meta: defaultPlateMeta({ sampleName }),
      originalSrc: result.canvas ? result.canvas.toDataURL('image/png') : null,
    });
    // Keep canvas for the plate we activate last
    return { plate, canvas: result.canvas, file };
  }, []);

  const activateLoadedPlate = useCallback((plate, canvas) => {
    fullResCanvasRef.current = canvas;
    originalSrcCacheRef.current = {
      canvas,
      dataUrl: plate.originalSrc,
    };
    setActivePlateId(plate.id);
    activePlateIdRef.current = plate.id;
    applyPlateToEditor(plate);
  }, [applyPlateToEditor]);

  const addPlatesFromFiles = useCallback(
    async (files) => {
      const list = [...(files ?? [])].filter(Boolean);
      if (list.length === 0) return;

      setLoadingImage(true);
      setUploadError(null);
      syncActiveIntoPlates();

      try {
        const created = [];
        for (let i = 0; i < list.length; i += 1) {
          setLoadingLabel(
            list.length > 1 ? `Loading plate ${i + 1} of ${list.length}…` : 'Loading image…'
          );
          try {
            const { plate, canvas, file } = await createPlateFromFile(list[i]);
            created.push({ plate, canvas });
            trackRecentFile(file, 'colony-counter').catch(() => {});
            await new Promise((r) => setTimeout(r, 0));
          } catch (err) {
            setUploadError(`${list[i].name}: ${err.message || 'Failed to load image'}`);
          }
        }

        if (created.length === 0) return;

        const nextPlates = [...platesRef.current, ...created.map((c) => c.plate)];
        platesRef.current = nextPlates;
        setPlates(nextPlates);

        if (!sessionName) {
          setSessionName(created[0].plate.sampleName || 'colony-session');
        }

        const last = created[created.length - 1];
        activateLoadedPlate(last.plate, last.canvas);
        setIsDirty(true);
        dirtySinceRef.current = Date.now();
      } finally {
        setLoadingImage(false);
        setLoadingLabel('Loading image…');
      }
    },
    [syncActiveIntoPlates, createPlateFromFile, activateLoadedPlate, sessionName]
  );

  /** First upload or replace-empty: same as add. */
  const loadImage = useCallback(
    async (file) => {
      await addPlatesFromFiles([file]);
    },
    [addPlatesFromFiles]
  );

  useOpenFileListener('colony-counter', (file) => addPlatesFromFiles([file]));

  const dismissUploadError = useCallback(() => {
    setUploadError(null);
  }, []);

  const removePlate = useCallback(
    (plateId) => {
      syncActiveIntoPlates();
      const remaining = platesRef.current.filter((p) => p.id !== plateId);
      if (remaining.length === platesRef.current.length) return;

      platesRef.current = remaining;
      setPlates(remaining);
      markDirty();

      if (remaining.length === 0) {
        setActivePlateId(null);
        activePlateIdRef.current = null;
        setImage(null);
        setDots([]);
        setHistory([[]]);
        setHistoryIndex(0);
        fullResCanvasRef.current = null;
        originalSrcCacheRef.current = { canvas: null, dataUrl: null };
        setPlateMeta(defaultPlateMeta());
        return;
      }

      if (plateId === activePlateIdRef.current) {
        const next = remaining[remaining.length - 1];
        setActivePlateId(next.id);
        activePlateIdRef.current = next.id;
        applyPlateToEditor(next);
      }
    },
    [syncActiveIntoPlates, markDirty, applyPlateToEditor]
  );

  const goToPrevPlate = useCallback(() => {
    const idx = platesRef.current.findIndex((p) => p.id === activePlateIdRef.current);
    if (idx > 0) switchToPlate(platesRef.current[idx - 1].id);
  }, [switchToPlate]);

  const goToNextPlate = useCallback(() => {
    const idx = platesRef.current.findIndex((p) => p.id === activePlateIdRef.current);
    if (idx >= 0 && idx < platesRef.current.length - 1) {
      switchToPlate(platesRef.current[idx + 1].id);
    }
  }, [switchToPlate]);

  const findDotAt = useCallback(
    (x, y) => {
      for (let i = dots.length - 1; i >= 0; i--) {
        const dot = dots[i];
        const dx = x - dot.x;
        const dy = y - dot.y;
        if (Math.sqrt(dx * dx + dy * dy) <= dot.radius + 4) {
          return dot;
        }
      }
      return null;
    },
    [dots]
  );

  const exportImage = useCallback(() => {
    if (!image) return;

    const displayW = image.displayWidth ?? image.naturalWidth;
    const displayH = image.displayHeight ?? image.naturalHeight;
    const scaleX = image.naturalWidth / displayW;
    const scaleY = image.naturalHeight / displayH;

    const offscreen = document.createElement('canvas');
    offscreen.width = image.naturalWidth;
    offscreen.height = image.naturalHeight;
    const ctx = offscreen.getContext('2d');

    const drawDots = () => {
      dots.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.x * scaleX, dot.y * scaleY, dot.radius * scaleX, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba(dot.color, opacity);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5 * scaleX;
        ctx.stroke();
      });

      const link = document.createElement('a');
      const base = plateMeta.sampleName || sessionName || 'colony-count';
      link.download = `${base}.png`;
      link.href = offscreen.toDataURL('image/png');
      link.click();
    };

    const fullCanvas = fullResCanvasRef.current;
    if (fullCanvas) {
      ctx.drawImage(fullCanvas, 0, 0);
      drawDots();
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, image.naturalWidth, image.naturalHeight);
      drawDots();
    };
    img.src = image.src;
  }, [image, dots, opacity, plateMeta.sampleName, sessionName]);

  const completeSave = useCallback(() => {
    setLastSaved(new Date());
    setIsDirty(false);
    dirtySinceRef.current = null;
    setRemindSavePulse(false);
    setShowSavedFlash(true);
    setTimeout(() => setShowSavedFlash(false), 3000);
  }, []);

  const buildColonySnapshot = useCallback(() => {
    const synced = syncActiveIntoPlates();
    const live = liveRef.current;
    return buildBatchSessionObject({
      sessionName: live.sessionName || 'colony-session',
      activePlateId: activePlateIdRef.current,
      categories: live.categories,
      plates: synced,
    });
  }, [syncActiveIntoPlates]);

  const saveSession = useCallback(async () => {
    if (!image && platesRef.current.length === 0) return;
    const state = buildColonySnapshot();
    const project = createEmptyProject({
      name: sessionName || 'colony-session',
      appVersion: APP_VERSION,
    });
    const tabId = 'tab-1';
    project.workspace.tabs = [{ id: tabId, toolId: 'colony-counter', label: 'Colony Counter (1)' }];
    project.workspace.activeTabId = tabId;
    project.tools[tabId] = {
      toolId: 'colony-counter',
      stateVersion: 2,
      state,
    };
    const ok = await downloadText(
      JSON.stringify(project, null, 2),
      `${sessionName || 'colony-session'}.benchy`
    );
    if (ok) completeSave();
  }, [image, sessionName, buildColonySnapshot, completeSave]);

  const applyProjectOrSession = useCallback(
    (content) => {
      try {
        const project = importProjectFromText(content, { appVersion: APP_VERSION });
        if (isLabtoolsProject(project)) {
          const entry = Object.values(project.tools).find((t) => t.toolId === 'colony-counter');
          if (entry?.state) return applySession(entry.state);
          alert('This project has no Colony Counter data.');
          return false;
        }
        return applySession(project);
      } catch {
        alert('Invalid project file.');
        return false;
      }
    },
    [applySession]
  );

  const openSession = useCallback(async () => {
    const content = await pickTextFile(['.benchy', '.labtools', '.colonycount']);
    if (content) applyProjectOrSession(content);
  }, [applyProjectOrSession]);

  const handleSessionFileSelected = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        applyProjectOrSession(ev.target.result);
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [applyProjectOrSession]
  );

  const handleAddPlateFilesSelected = useCallback(
    (e) => {
      const files = [...(e.target.files ?? [])];
      e.target.value = '';
      if (files.length) addPlatesFromFiles(files);
    },
    [addPlatesFromFiles]
  );

  const openAddPlatePicker = useCallback(() => {
    addPlateFileInputRef.current?.click();
  }, []);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !initialState) return;
    hydratedRef.current = true;
    applySession(initialState);
  }, [initialState, applySession]);

  useEffect(() => {
    if (!isDirty || !dirtySinceRef.current) {
      setRemindSavePulse(false);
      return;
    }
    const elapsed = Date.now() - dirtySinceRef.current;
    const remaining = Math.max(0, 60000 - elapsed);
    const timer = setTimeout(() => setRemindSavePulse(true), remaining);
    return () => clearTimeout(timer);
  }, [isDirty]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      if (isEditableTarget(e.target)) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          if (image || plates.length > 0) saveSession();
          return;
        }
        if (e.key === 'o') {
          e.preventDefault();
          openSession();
          return;
        }
        if (!image) return;
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          redo();
        }
        return;
      }

      if (plates.length < 2) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevPlate();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextPlate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isActive,
    image,
    plates.length,
    undo,
    redo,
    saveSession,
    openSession,
    goToPrevPlate,
    goToNextPlate,
  ]);

  useEffect(() => {
    setInstanceDirty(instanceId, isDirty);
  }, [instanceId, isDirty]);

  useEffect(() => {
    return () => clearInstanceDirty(instanceId);
  }, [instanceId]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const activePlateIndex = plates.findIndex((p) => p.id === activePlateId);

  /** Plates list for UI — merge live active plate counts into strip. */
  const platesForUi = useMemo(() => {
    if (!activePlateId || !image) return plates;
    return plates.map((p) =>
      p.id === activePlateId
        ? {
            ...p,
            name: plateMeta.sampleName || p.name,
            dots,
            imageData: image.src,
          }
        : p
    );
  }, [plates, activePlateId, image, dots, plateMeta.sampleName]);

  return {
    dots,
    categories,
    activeCategory,
    setActiveCategory: handleSetActiveCategory,
    categoryCounts,
    updateCategoryLabel,
    updateCategoryColor,
    addCategory,
    deleteCategory,
    dotRadius,
    setDotRadius: handleSetDotRadius,
    opacity,
    setOpacity: handleSetOpacity,
    image,
    loadingImage,
    loadingLabel,
    uploadError,
    dismissUploadError,
    loadImage,
    addPlatesFromFiles,
    addDot,
    removeDot,
    moveDot,
    applyAutoColonies,
    setDotColonyType,
    clearAll,
    findDotAt,
    undo,
    redo,
    exportImage,
    canUndo,
    canRedo,
    colonyCount: dots.length,
    dilutionMode,
    setDilutionMode: handleSetDilutionMode,
    dilutionExponent,
    setDilutionExponent: handleSetDilutionExponent,
    customDilution,
    setCustomDilution: handleSetCustomDilution,
    volumeMl,
    setVolumeMl: handleSetVolumeMl,
    sessionName,
    lastSaved,
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
    getSnapshot: buildColonySnapshot,
    // Batch plates
    plates: platesForUi,
    activePlateId,
    switchToPlate,
    renamePlate,
    removePlate,
    goToPrevPlate,
    goToNextPlate,
    canPrevPlate: activePlateIndex > 0,
    canNextPlate: activePlateIndex >= 0 && activePlateIndex < plates.length - 1,
    plateMeta,
    updatePlateMeta,
  };
}
