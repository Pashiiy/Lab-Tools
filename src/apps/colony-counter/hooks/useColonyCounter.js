import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_CATEGORIES,
  createCategory,
  getCategoryCounts,
} from '../utils/categories';
import {
  getAutosaveKey,
  buildSessionObject,
  formatTimeAgo,
  syncDotIdCounter,
  triggerJsonDownload,
  validateSession,
} from '../utils/session';
import {
  setInstanceDirty,
  clearInstanceDirty,
} from '../../../shared/dirtyStateRegistry';
import { loadImageForTool } from '../../../shared/image/rawImageStore';
import { createDefaultDisplayDataUrl } from '../../../shared/image/displayRenderer';

let nextId = 1;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export { hexToRgba };

export function useColonyCounter(instanceId, isActive = true) {
  const autosaveKey = getAutosaveKey(instanceId);
  const [dots, setDots] = useState([]);
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('cat-1');
  const [dotRadius, setDotRadius] = useState(12);
  const [opacity, setOpacity] = useState(0.7);
  const [image, setImage] = useState(null);
  const [dilutionMode, setDilutionMode] = useState('preset');
  const [dilutionExponent, setDilutionExponent] = useState(1);
  const [customDilution, setCustomDilution] = useState('');
  const [volumeMl, setVolumeMl] = useState(0.1);

  const [sessionName, setSessionName] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showSavedFlash, setShowSavedFlash] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);
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

    const img = new Image();
    img.onload = () => {
      setImage({
        src: session.imageData,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        name: session.imageName,
      });
    };
    img.src = session.imageData;

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
    localStorage.removeItem(autosaveKey);

    requestAnimationFrame(() => {
      skipDirtyRef.current = false;
    });

    return true;
  }, [autosaveKey]);

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
    try {
      const loaded = await loadImageForTool(file);
      const displaySrc = createDefaultDisplayDataUrl(loaded.raw);

      skipDirtyRef.current = true;
      setImage({
        src: displaySrc,
        naturalWidth: loaded.naturalWidth,
        naturalHeight: loaded.naturalHeight,
        name: loaded.name,
        bitDepth: loaded.bitDepth,
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
    } catch (err) {
      alert(err.message || 'Failed to load image');
    }
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

    const offscreen = document.createElement('canvas');
    offscreen.width = image.naturalWidth;
    offscreen.height = image.naturalHeight;
    const ctx = offscreen.getContext('2d');

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      dots.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, 2 * Math.PI);
        ctx.fillStyle = hexToRgba(dot.color, opacity);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      const link = document.createElement('a');
      link.download = 'colony-count.png';
      link.href = offscreen.toDataURL('image/png');
      link.click();
    };
    img.src = image.src;
  }, [image, dots, opacity]);

  const completeSave = useCallback(() => {
    setLastSaved(new Date());
    setIsDirty(false);
    dirtySinceRef.current = null;
    setRemindSavePulse(false);
    setShowSavedFlash(true);
    localStorage.removeItem(autosaveKey);
    setTimeout(() => setShowSavedFlash(false), 3000);
  }, [autosaveKey]);

  const saveSession = useCallback(async () => {
    if (!image) return;

    const session = getSessionSnapshot();
    const jsonContent = JSON.stringify(session, null, 2);
    const defaultName = sessionName || 'colony-session';

    if (window.electronAPI?.saveSession) {
      const result = await window.electronAPI.saveSession(defaultName, jsonContent);
      if (result?.success) {
        completeSave();
      }
    } else {
      triggerJsonDownload(jsonContent, `${defaultName}.colonycount`);
      completeSave();
    }
  }, [image, getSessionSnapshot, sessionName, completeSave]);

  const loadSessionFromContent = useCallback(
    (content) => {
      try {
        const session = JSON.parse(content);
        return applySession(session);
      } catch {
        alert('Invalid session file.');
        return false;
      }
    },
    [applySession]
  );

  const openSession = useCallback(async () => {
    if (window.electronAPI?.loadSession) {
      const result = await window.electronAPI.loadSession();
      if (result?.success && result.content) {
        loadSessionFromContent(result.content);
      }
    } else {
      sessionFileInputRef.current?.click();
    }
  }, [loadSessionFromContent]);

  const handleSessionFileSelected = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        loadSessionFromContent(ev.target.result);
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadSessionFromContent]
  );

  const restoreAutosave = useCallback(() => {
    if (pendingRestore) {
      applySession(pendingRestore);
      setShowRestorePrompt(false);
      setPendingRestore(null);
    }
  }, [pendingRestore, applySession]);

  const discardAutosave = useCallback(() => {
    localStorage.removeItem(autosaveKey);
    setShowRestorePrompt(false);
    setPendingRestore(null);
  }, [autosaveKey]);

  useEffect(() => {
    const saved = localStorage.getItem(autosaveKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (validateSession(parsed)) {
        setPendingRestore(parsed);
        setShowRestorePrompt(true);
      }
    } catch {
      localStorage.removeItem(autosaveKey);
    }
  }, [autosaveKey]);

  useEffect(() => {
    if (!image?.src) return;
    const snapshot = getSessionSnapshot();
    localStorage.setItem(autosaveKey, JSON.stringify(snapshot));
  }, [
    autosaveKey,
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
    image?.src,
    getSessionSnapshot,
  ]);

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
  };
}
