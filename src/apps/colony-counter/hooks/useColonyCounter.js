import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_CATEGORIES,
  createCategory,
  getCategoryCounts,
} from '../utils/categories';
import {
  buildSessionObject,
  syncDotIdCounter,
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

export function useColonyCounter(instanceId, isActive = true, initialState = null) {
  const [dots, setDots] = useState([]);
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('cat-1');
  const [dotRadius, setDotRadius] = useState(12);
  const [opacity, setOpacity] = useState(0.7);
  const [image, setImage] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fullResCanvasRef = useRef(null);
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
  const dirtySinceRef = useRef(null);

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

  const getSessionSnapshot = useCallback(
    () =>
      buildSessionObject({
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
        sessionName,
      }),
    [
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
      sessionName,
    ]
  );

  const applySession = useCallback((session) => {
    if (!validateSession(session)) {
      alert('This file appears to be corrupted or incompatible.');
      return false;
    }

    skipDirtyRef.current = true;

    const displaySrc = session.imageData;
    const applyImageState = (displayImg, fullDims) => {
      setImage({
        src: displaySrc,
        naturalWidth: fullDims?.width ?? displayImg.naturalWidth,
        naturalHeight: fullDims?.height ?? displayImg.naturalHeight,
        displayWidth: displayImg.naturalWidth,
        displayHeight: displayImg.naturalHeight,
        name: session.imageName,
      });
    };

    if (session.originalSrc) {
      const fullImg = new Image();
      fullImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = fullImg.naturalWidth;
        canvas.height = fullImg.naturalHeight;
        canvas.getContext('2d').drawImage(fullImg, 0, 0);
        fullResCanvasRef.current = canvas;

        const displayImg = new Image();
        displayImg.onload = () => {
          applyImageState(displayImg, {
            width: fullImg.naturalWidth,
            height: fullImg.naturalHeight,
          });
        };
        displayImg.src = displaySrc;
      };
      fullImg.src = session.originalSrc;
    } else {
      const img = new Image();
      img.onload = () => {
        fullResCanvasRef.current = null;
        applyImageState(img, null);
      };
      img.src = displaySrc;
    }

    const sessionDots = session.dots || [];
    nextId = syncDotIdCounter(sessionDots);
    setDots(sessionDots);
    setHistory([sessionDots]);
    setHistoryIndex(0);
    setCategories(session.categories || DEFAULT_CATEGORIES);
    setActiveCategory(
      session.activeCategory || session.categories?.[0]?.id || 'cat-1'
    );
    setDotRadius(session.dotRadius || 12);
    setOpacity(session.opacity ?? 0.7);

    const cfu = session.cfu || {};
    const useCustom =
      cfu.dilutionMode === 'custom' ||
      (cfu.customDilution != null && cfu.customDilution !== '');

    if (useCustom) {
      setDilutionMode('custom');
      setCustomDilution(String(cfu.customDilution ?? ''));
    } else {
      setDilutionMode('preset');
      setDilutionExponent(Math.abs(cfu.dilutionExponent ?? 4));
      setCustomDilution('');
    }

    setVolumeMl(cfu.volumeMl ?? 0.1);
    setSessionName(
      session.imageName?.replace(/\.[^/.]+$/, '') || 'colony-session'
    );
    setLastSaved(session.savedAt ? new Date(session.savedAt) : new Date());
    setIsDirty(false);
    dirtySinceRef.current = null;
    setRemindSavePulse(false);

    requestAnimationFrame(() => {
      skipDirtyRef.current = false;
    });

    return true;
  }, []);

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

  const clearAll = useCallback(() => {
    if (dots.length === 0) return;
    pushHistory([]);
  }, [dots, pushHistory]);

  const updateCategoryLabel = useCallback(
    (id, label) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, label } : c))
      );
      markDirty();
    },
    [markDirty]
  );

  const updateCategoryColor = useCallback(
    (id, color) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, color } : c))
      );
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
      const hasDots = dots.some((d) => d.categoryId === id);
      if (categories.length <= 1 || hasDots) return;
      setCategories((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeCategory === id) {
          setActiveCategory(next[0].id);
        }
        return next;
      });
      markDirty();
    },
    [categories.length, dots, activeCategory, markDirty]
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

  const loadImage = useCallback(async (file) => {
    setLoadingImage(true);
    setUploadError(null);

    try {
      const result = await loadImageUniversal(file);
      fullResCanvasRef.current = result.canvas;

      skipDirtyRef.current = true;
      setImage({
        src: result.displaySrc,
        naturalWidth: result.naturalWidth,
        naturalHeight: result.naturalHeight,
        displayWidth: result.displayWidth,
        displayHeight: result.displayHeight,
        name: result.name,
      });
      setDots([]);
      setHistory([[]]);
      setHistoryIndex(0);
      setSessionName(file.name.replace(/\.[^/.]+$/, ''));
      setIsDirty(true);
      dirtySinceRef.current = Date.now();
      requestAnimationFrame(() => {
        skipDirtyRef.current = false;
      });
      trackRecentFile(file, 'colony-counter').catch(() => {});
    } catch (err) {
      fullResCanvasRef.current = null;
      setUploadError(err.message || 'Failed to load image');
    } finally {
      setLoadingImage(false);
    }
  }, []);

  useOpenFileListener('colony-counter', loadImage);

  const dismissUploadError = useCallback(() => {
    setUploadError(null);
  }, []);

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
      link.download = 'colony-count.png';
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
  }, [image, dots, opacity]);

  const completeSave = useCallback(() => {
    setLastSaved(new Date());
    setIsDirty(false);
    dirtySinceRef.current = null;
    setRemindSavePulse(false);
    setShowSavedFlash(true);
    setTimeout(() => setShowSavedFlash(false), 3000);
  }, []);

  // Build a colony-counter session snapshot, embedding the full-res image.
  const buildColonySnapshot = useCallback(() => {
    const session = getSessionSnapshot();
    if (fullResCanvasRef.current) {
      session.originalSrc = fullResCanvasRef.current.toDataURL('image/png');
    }
    return session;
  }, [getSessionSnapshot]);

  // Save the current colony work as a unified `.labtools` project (single tab).
  const saveSession = useCallback(async () => {
    if (!image) return;
    const project = createEmptyProject({
      name: sessionName || 'colony-session',
      appVersion: APP_VERSION,
    });
    const tabId = 'tab-1';
    project.workspace.tabs = [{ id: tabId, toolId: 'colony-counter', label: 'Colony Counter (1)' }];
    project.workspace.activeTabId = tabId;
    project.tools[tabId] = {
      toolId: 'colony-counter',
      stateVersion: 1,
      state: buildColonySnapshot(),
    };
    const ok = await downloadText(JSON.stringify(project, null, 2), `${sessionName || 'colony-session'}.labtools`);
    if (ok) completeSave();
  }, [image, sessionName, buildColonySnapshot, completeSave]);

  // Extract a colony session from any `.labtools` (or legacy `.colonycount`).
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
    const content = await pickTextFile(['.labtools']);
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

  // Hydrate from a shell-restored `.labtools` project (runs once on mount).
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
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          if (image) saveSession();
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, image, undo, redo, saveSession, openSession]);

  useEffect(() => {
    setInstanceDirty(instanceId, isDirty);
  }, [instanceId, isDirty]);

  useEffect(() => {
    return () => clearInstanceDirty(instanceId);
  }, [instanceId]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

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
    remindSavePulse,
    handleSessionNameChange,
    getSnapshot: buildColonySnapshot,
  };
}
