import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { loadRawImageFromFile, toAnalysisImage } from '../../../shared/image/rawImageStore';
import { DEFAULT_DISPLAY_ADJUSTMENTS } from '../../../shared/image/constants';
import { ROI_TYPES as ROI_GEOMETRY } from '../engine/fijiConstants';
import {
  cleanupPairsAfterRoiDelete,
  computeAveragedRatio,
  createPair,
  createRoiEntry,
  CREATION_MODES,
  DEFAULT_ROI_TEMPLATE,
  enrichAllRois,
  enrichPairs,
  getIncompletePair,
  normalizeRect,
  placeRoiSetAtPoint,
  reorderPairsById,
  ROI_ROLES,
} from '../engine/roiModel';
import {
  bumpGelIdPast,
  createGelEntry,
  createInitialDocument,
  updateGelInList,
} from '../utils/gelDataset';
import { serializeRaw, deserializeRaw } from '../utils/gelPersistence';
import { useRoiHistory } from './useRoiHistory';
import { exportGelQuantExcel } from '../utils/exportExcel';
import { exportGelQuantCsv } from '../utils/exportCsv';
import {
  setCachedThumbnail,
  getCachedThumbnail,
} from '../utils/gelImageCache';
import {
  createGelThumbnailDataUrl,
  scheduleThumbnailBuild,
} from '../utils/gelThumbnail';
import { trackRecentFile } from '../../../shared/persistence/trackRecentFile.js';
import { useOpenFileListener } from '../../../shared/persistence/useOpenFileListener.js';

export function useGelQuantification(initialState = null) {
  const [gels, setGels] = useState([]);
  const [activeGelId, setActiveGelId] = useState(null);
  const [raw, setRaw] = useState(null);
  const [image, setImage] = useState(null);
  const [displayAdjustments, setDisplayAdjustmentsState] = useState({
    ...DEFAULT_DISPLAY_ADJUSTMENTS,
  });
  const [inverted, setInvertedState] = useState(false);
  const [fijiParityMode, setFijiParityMode] = useState(true);
  const [roiTemplate, setRoiTemplate] = useState({ ...DEFAULT_ROI_TEMPLATE });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('image');
  const [sessionMeta, setSessionMeta] = useState({ strainName: '', description: '' });

  const {
    present: doc,
    commit,
    replace,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
  } = useRoiHistory(createInitialDocument);

  const docRef = useRef(doc);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  const syncActiveGel = useCallback(
    (patch) => {
      if (!activeGelId) return;
      setGels((prev) => updateGelInList(prev, activeGelId, patch));
    },
    [activeGelId]
  );

  useEffect(() => {
    if (!activeGelId) return;
    setGels((prev) => updateGelInList(prev, activeGelId, { doc }));
  }, [doc, activeGelId]);

  const applyGelState = useCallback(
    (gel) => {
      setRaw(gel.raw ?? null);
      setImage(gel.raw ? toAnalysisImage(gel.raw) : null);
      setDisplayAdjustmentsState({ ...gel.displayAdjustments });
      setInvertedState(!!gel.inverted);
      resetHistory(gel.doc ?? createInitialDocument());
    },
    [resetHistory]
  );

  // Hydrate from a shell-restored `.labtools` project (once on mount).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !initialState?.gels?.length) return;
    hydratedRef.current = true;
    const restored = initialState.gels.map((g) => ({
      id: g.id,
      name: g.name,
      raw: g.raw ? deserializeRaw(g.raw) : null,
      thumbnailUrl: null,
      displayAdjustments: { ...DEFAULT_DISPLAY_ADJUSTMENTS, ...g.displayAdjustments },
      inverted: !!g.inverted,
      doc: g.doc ?? createInitialDocument(),
    }));
    bumpGelIdPast(restored.map((g) => g.id));
    setGels(restored);
    setSessionMeta(initialState.sessionMeta ?? { strainName: '', description: '' });
    if (initialState.fijiParityMode != null) setFijiParityMode(initialState.fijiParityMode);
    setActiveTab(initialState.activeTab ?? 'image');
    const active = restored.find((g) => g.id === initialState.activeGelId) ?? restored[0];
    if (active) {
      setActiveGelId(active.id);
      applyGelState(active);
    }
  }, [initialState, applyGelState]);

  const queueThumbnailForGel = useCallback((gelId, rawStore) => {
    const cached = getCachedThumbnail(gelId);
    if (cached) {
      setGels((prev) => updateGelInList(prev, gelId, { thumbnailUrl: cached }));
      return;
    }

    scheduleThumbnailBuild(() => createGelThumbnailDataUrl(rawStore)).then((url) => {
      if (!url) return;
      setCachedThumbnail(gelId, url);
      setGels((prev) => updateGelInList(prev, gelId, { thumbnailUrl: url }));
    });
  }, []);

  const switchToGel = useCallback(
    (gelId) => {
      const gel = gels.find((g) => g.id === gelId);
      if (!gel) return;
      if (activeGelId && activeGelId !== gelId) {
        syncActiveGel({
          doc: docRef.current,
          displayAdjustments,
          inverted,
        });
      }
      setActiveGelId(gelId);
      applyGelState(gel);
    },
    [gels, activeGelId, syncActiveGel, displayAdjustments, inverted, applyGelState]
  );

  const enrichedPairs = useMemo(
    () => (image ? enrichPairs(doc.pairs, doc.rois, image) : []),
    [doc.pairs, doc.rois, image]
  );

  const roisWithMeasurements = useMemo(
    () => (image ? enrichAllRois(doc.rois, image) : []),
    [doc.rois, image]
  );

  const averagedRatio = useMemo(
    () => computeAveragedRatio(enrichedPairs),
    [enrichedPairs]
  );

  const allGelResults = useMemo(() => {
    return gels.map((gel) => {
      if (!gel.raw) {
        return {
          gelId: gel.id,
          gelName: gel.name,
          raw: null,
          pairs: [],
          averagedRatio: null,
        };
      }
      const img = toAnalysisImage(gel.raw);
      const gelDoc = gel.id === activeGelId ? doc : gel.doc;
      const pairs = enrichPairs(gelDoc.pairs, gelDoc.rois, img);
      return {
        gelId: gel.id,
        gelName: gel.name,
        raw: gel.raw,
        pairs,
        averagedRatio: computeAveragedRatio(pairs),
      };
    });
  }, [gels, activeGelId, doc]);

  const allEnrichedPairs = useMemo(
    () =>
      allGelResults.flatMap(({ gelId, gelName, pairs }) =>
        pairs.map((p) => ({
          ...p,
          gelId,
          gelName,
          lane: p.index,
        }))
      ),
    [allGelResults]
  );

  const totalCompletePairs = useMemo(
    () => allEnrichedPairs.filter((p) => p.complete).length,
    [allEnrichedPairs]
  );

  const sessionAveragedRatio = useMemo(
    () => computeAveragedRatio(allEnrichedPairs),
    [allEnrichedPairs]
  );

  const activeRoi = useMemo(
    () => roisWithMeasurements.find((r) => r.id === doc.activeRoiId) ?? null,
    [roisWithMeasurements, doc.activeRoiId]
  );

  const incompletePair = useMemo(() => getIncompletePair(doc.pairs), [doc.pairs]);

  const activeGelIndex = useMemo(
    () => gels.findIndex((g) => g.id === activeGelId),
    [gels, activeGelId]
  );

  const updateDoc = useCallback(
    (updater) => {
      commit((prev) =>
        typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      );
    },
    [commit]
  );

  const setDisplayAdjustments = useCallback(
    (partial) => {
      setDisplayAdjustmentsState((prev) => {
        const next = { ...prev, ...partial };
        syncActiveGel({ displayAdjustments: next });
        return next;
      });
    },
    [syncActiveGel]
  );

  const setInverted = useCallback(
    (value) => {
      setInvertedState(value);
      syncActiveGel({ inverted: value });
    },
    [syncActiveGel]
  );

  const setTemplate = useCallback((partial) => {
    setRoiTemplate((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetTemplateDefaults = useCallback(() => {
    setRoiTemplate({ ...DEFAULT_ROI_TEMPLATE });
  }, []);

  const setCreationMode = useCallback(
    (mode) => {
      replace({ ...doc, creationMode: mode });
    },
    [doc, replace]
  );

  const addGelFromFile = useCallback(
    async (file) => {
      if (!file) return;
      setLoading(true);
      try {
        const loadedRaw = await loadRawImageFromFile(file);
        const entry = createGelEntry(loadedRaw);
        setGels((prev) => [...prev, entry]);
        setActiveGelId(entry.id);
        applyGelState(entry);
        setActiveTab('image');
        queueThumbnailForGel(entry.id, loadedRaw);
        trackRecentFile(file, 'gel-quantification').catch(() => {});
      } catch (err) {
        alert(err.message || 'Failed to load image');
      } finally {
        setLoading(false);
      }
    },
    [applyGelState, queueThumbnailForGel]
  );

  useOpenFileListener('gel-quantification', addGelFromFile);

  const renameGel = useCallback((gelId, name) => {
    setGels((prev) => {
      const current = prev.find((g) => g.id === gelId);
      return updateGelInList(prev, gelId, {
        name: name.trim() || current?.name || 'Gel',
      });
    });
  }, []);

  const goToPrevGel = useCallback(() => {
    if (gels.length < 2 || activeGelIndex <= 0) return;
    switchToGel(gels[activeGelIndex - 1].id);
  }, [gels, activeGelIndex, switchToGel]);

  const goToNextGel = useCallback(() => {
    if (gels.length < 2 || activeGelIndex >= gels.length - 1) return;
    switchToGel(gels[activeGelIndex + 1].id);
  }, [gels, activeGelIndex, switchToGel]);

  const selectRoi = useCallback(
    (roiId) => {
      replace({ ...docRef.current, activeRoiId: roiId });
    },
    [replace]
  );

  const createRoiAtClick = useCallback(
    (cx, cy) => {
      if (!image) return;

      const mode = doc.creationMode;

      if (mode === CREATION_MODES.CONTROL) {
        const incomplete = getIncompletePair(doc.pairs);
        if (!incomplete) {
          alert('Create a Target ROI first, then click Control on the matching band.');
          return;
        }
      }

      updateDoc((prev) => {
        const { innerROI, outerROI } = placeRoiSetAtPoint(
          cx,
          cy,
          roiTemplate,
          image.width,
          image.height
        );

        if (prev.creationMode === CREATION_MODES.TARGET) {
          const pairNum = prev.pairs.length + 1;
          const pair = createPair({ name: `Pair ${pairNum}` });
          const roi = createRoiEntry({
            name: `P${pairNum} Target`,
            role: ROI_ROLES.TARGET,
            pairId: pair.id,
            innerROI,
            outerROI,
          });

          return {
            ...prev,
            pairs: [...prev.pairs, { ...pair, targetRoiId: roi.id }],
            rois: [...prev.rois, roi],
            activeRoiId: roi.id,
            creationMode: CREATION_MODES.CONTROL,
          };
        }

        const incomplete = getIncompletePair(prev.pairs);
        if (!incomplete) return prev;

        const pairNum = prev.pairs.findIndex((p) => p.id === incomplete.id) + 1;
        const roi = createRoiEntry({
          name: `P${pairNum} Control`,
          role: ROI_ROLES.CONTROL,
          pairId: incomplete.id,
          innerROI,
          outerROI,
        });

        return {
          ...prev,
          pairs: prev.pairs.map((p) =>
            p.id === incomplete.id ? { ...p, controlRoiId: roi.id } : p
          ),
          rois: [...prev.rois, roi],
          activeRoiId: roi.id,
          creationMode: CREATION_MODES.TARGET,
        };
      });
    },
    [doc.creationMode, doc.pairs, image, roiTemplate, updateDoc]
  );

  const deleteRoi = useCallback(
    (roiId) => {
      updateDoc((prev) => {
        const nextRois = prev.rois.filter((r) => r.id !== roiId);
        let nextPairs = prev.pairs.map((p) => ({
          ...p,
          targetRoiId: p.targetRoiId === roiId ? null : p.targetRoiId,
          controlRoiId: p.controlRoiId === roiId ? null : p.controlRoiId,
        }));
        nextPairs = cleanupPairsAfterRoiDelete(nextPairs, nextRois);

        let nextActive = prev.activeRoiId;
        if (prev.activeRoiId === roiId) {
          nextActive = nextRois[nextRois.length - 1]?.id ?? null;
        }

        const hasIncomplete = getIncompletePair(nextPairs);
        const nextMode = hasIncomplete ? CREATION_MODES.CONTROL : CREATION_MODES.TARGET;

        return {
          ...prev,
          pairs: nextPairs,
          rois: nextRois,
          activeRoiId: nextActive,
          creationMode: nextMode,
        };
      });
    },
    [updateDoc]
  );

  const deletePair = useCallback(
    (pairId) => {
      updateDoc((prev) => {
        const pair = prev.pairs.find((p) => p.id === pairId);
        if (!pair) return prev;

        const removeIds = new Set([pair.targetRoiId, pair.controlRoiId].filter(Boolean));
        const nextRois = prev.rois.filter((r) => !removeIds.has(r.id));
        const nextPairs = prev.pairs.filter((p) => p.id !== pairId);

        let nextActive = prev.activeRoiId;
        if (removeIds.has(prev.activeRoiId)) {
          nextActive = nextRois[nextRois.length - 1]?.id ?? null;
        }

        const hasIncomplete = getIncompletePair(nextPairs);
        const nextMode = hasIncomplete ? CREATION_MODES.CONTROL : CREATION_MODES.TARGET;

        return {
          ...prev,
          pairs: nextPairs,
          rois: nextRois,
          activeRoiId: nextActive,
          creationMode: nextMode,
        };
      });
    },
    [updateDoc]
  );

  const renamePair = useCallback(
    (pairId, name) => {
      updateDoc((prev) => ({
        ...prev,
        pairs: prev.pairs.map((p) => (p.id === pairId ? { ...p, name } : p)),
      }));
    },
    [updateDoc]
  );

  const reorderPairs = useCallback(
    (fromPairId, toPairId) => {
      updateDoc((prev) => {
        const nextPairs = reorderPairsById(prev.pairs, fromPairId, toPairId);
        if (nextPairs === prev.pairs) return prev;
        return { ...prev, pairs: nextPairs };
      });
    },
    [updateDoc]
  );

  const updateSessionFields = useCallback((fields) => {
    setSessionMeta((prev) => ({ ...prev, ...fields }));
  }, []);

  const setRoiUserLabel = useCallback(
    (roiId, userLabel, gelId = null) => {
      const targetGelId = gelId ?? activeGelId;
      if (targetGelId === activeGelId) {
        updateDoc((prev) => ({
          ...prev,
          rois: prev.rois.map((r) => (r.id === roiId ? { ...r, userLabel } : r)),
        }));
        return;
      }
      setGels((prev) =>
        prev.map((g) => {
          if (g.id !== targetGelId) return g;
          return {
            ...g,
            doc: {
              ...g.doc,
              rois: g.doc.rois.map((r) =>
                r.id === roiId ? { ...r, userLabel } : r
              ),
            },
          };
        })
      );
    },
    [activeGelId, updateDoc]
  );

  const reassignRoi = useCallback(
    (roiId, pairId, role) => {
      updateDoc((prev) => {
        const roi = prev.rois.find((r) => r.id === roiId);
        if (!roi) return prev;

        let pairs = prev.pairs.map((p) => {
          let next = { ...p };
          if (p.targetRoiId === roiId) next.targetRoiId = null;
          if (p.controlRoiId === roiId) next.controlRoiId = null;
          return next;
        });

        pairs = pairs.map((p) => {
          if (p.id !== pairId) return p;
          if (role === ROI_ROLES.TARGET) {
            const displaced = p.targetRoiId;
            return {
              ...p,
              targetRoiId: roiId,
              controlRoiId: p.controlRoiId === roiId ? displaced : p.controlRoiId,
            };
          }
          const displaced = p.controlRoiId;
          return {
            ...p,
            controlRoiId: roiId,
            targetRoiId: p.targetRoiId === roiId ? displaced : p.targetRoiId,
          };
        });

        pairs = cleanupPairsAfterRoiDelete(pairs, prev.rois);

        const rois = prev.rois.map((r) =>
          r.id === roiId ? { ...r, pairId, role } : r
        );

        return { ...prev, pairs, rois };
      });
    },
    [updateDoc]
  );

  const updateRoiGeometry = useCallback(
    (roiId, which, rect) => {
      const key = which === ROI_GEOMETRY.OUTER ? 'outerROI' : 'innerROI';
      const intRoi = rect ? normalizeRect(rect) : null;
      updateDoc((prev) => ({
        ...prev,
        rois: prev.rois.map((r) => (r.id === roiId ? { ...r, [key]: intRoi } : r)),
      }));
    },
    [updateDoc]
  );

  const buildExportPayload = useCallback(() => {
    if (activeGelId) {
      syncActiveGel({ doc: docRef.current, displayAdjustments, inverted });
    }
    return gels.map((gel) => {
      const img = toAnalysisImage(gel.raw);
      const gelDoc =
        gel.id === activeGelId
          ? docRef.current
          : gel.doc;
      const pairs = enrichPairs(gelDoc.pairs, gelDoc.rois, img);
      return {
        gelId: gel.id,
        gelName: gel.name,
        raw: gel.raw,
        pairs,
        averagedRatio: computeAveragedRatio(pairs),
      };
    });
  }, [gels, activeGelId, displayAdjustments, inverted, syncActiveGel]);

  const exportExcel = useCallback(async () => {
    const gelResults = buildExportPayload();
    await exportGelQuantExcel({
      gelResults,
      strainName: sessionMeta.strainName ?? '',
      description: sessionMeta.description ?? '',
    });
  }, [buildExportPayload, sessionMeta]);

  const exportCsv = useCallback(() => {
    const gelResults = buildExportPayload();
    exportGelQuantCsv({
      gelResults,
      strainName: sessionMeta.strainName ?? '',
      description: sessionMeta.description ?? '',
    });
  }, [buildExportPayload, sessionMeta]);

  // JSON-safe snapshot for unified workspace autosave / `.labtools` export.
  const getSnapshot = useCallback(() => {
    if (gels.length === 0) return undefined;
    const serializedGels = gels.map((gel) => {
      const isActive = gel.id === activeGelId;
      return {
        id: gel.id,
        name: gel.name,
        displayAdjustments: isActive ? displayAdjustments : gel.displayAdjustments,
        inverted: isActive ? inverted : gel.inverted,
        doc: isActive ? docRef.current : gel.doc,
        raw: gel.raw ? serializeRaw(gel.raw) : null,
      };
    });
    return {
      gels: serializedGels,
      activeGelId,
      activeTab,
      sessionMeta,
      fijiParityMode,
    };
  }, [gels, activeGelId, displayAdjustments, inverted, activeTab, sessionMeta, fijiParityMode]);

  return {
    getSnapshot,
    gels,
    activeGelId,
    activeGelIndex,
    raw,
    image,
    displayAdjustments,
    setDisplayAdjustments,
    inverted,
    setInverted,
    fijiParityMode,
    setFijiParityMode,
    roiTemplate,
    setTemplate,
    resetTemplateDefaults,
    DEFAULT_ROI_TEMPLATE,
    loading,
    addGelFromFile,
    switchToGel,
    renameGel,
    goToPrevGel,
    goToNextGel,
    activeTab,
    setActiveTab,
    pairs: enrichedPairs,
    rois: roisWithMeasurements,
    allEnrichedPairs,
    allGelResults,
    totalCompletePairs,
    activeRoi,
    activeRoiId: doc.activeRoiId,
    creationMode: doc.creationMode,
    setCreationMode,
    incompletePair,
    strainName: sessionMeta.strainName ?? '',
    description: sessionMeta.description ?? '',
    averagedRatio,
    sessionAveragedRatio,
    selectRoi,
    createRoiAtClick,
    deleteRoi,
    deletePair,
    renamePair,
    reorderPairs,
    updateSessionFields,
    setRoiUserLabel,
    reassignRoi,
    updateRoiGeometry,
    undo,
    redo,
    canUndo,
    canRedo,
    exportExcel,
    exportCsv,
    CREATION_MODES,
    ROI_ROLES,
    ROI_GEOMETRY,
  };
}
