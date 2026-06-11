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
import { useRoiHistory } from './useRoiHistory';
import { exportGelQuantExcel } from '../utils/exportExcel';

function createInitialDocument() {
  return {
    pairs: [],
    rois: [],
    activeRoiId: null,
    creationMode: CREATION_MODES.TARGET,
    strainName: '',
    description: '',
  };
}

export function useGelQuantification() {
  const [raw, setRaw] = useState(null);
  const [image, setImage] = useState(null);
  const [displayAdjustments, setDisplayAdjustmentsState] = useState({
    ...DEFAULT_DISPLAY_ADJUSTMENTS,
  });
  const [roiTemplate, setRoiTemplate] = useState({ ...DEFAULT_ROI_TEMPLATE });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('image');

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

  const enrichedPairs = useMemo(
    () => enrichPairs(doc.pairs, doc.rois, image),
    [doc.pairs, doc.rois, image]
  );

  const roisWithMeasurements = useMemo(
    () => enrichAllRois(doc.rois, image),
    [doc.rois, image]
  );

  const averagedRatio = useMemo(
    () => computeAveragedRatio(enrichedPairs),
    [enrichedPairs]
  );

  const activeRoi = useMemo(
    () => roisWithMeasurements.find((r) => r.id === doc.activeRoiId) ?? null,
    [roisWithMeasurements, doc.activeRoiId]
  );

  const incompletePair = useMemo(
    () => getIncompletePair(doc.pairs),
    [doc.pairs]
  );

  const updateDoc = useCallback(
    (updater) => {
      commit((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));
    },
    [commit]
  );

  const setDisplayAdjustments = useCallback((partial) => {
    setDisplayAdjustmentsState((prev) => ({ ...prev, ...partial }));
  }, []);

  const setTemplate = useCallback((partial) => {
    setRoiTemplate((prev) => ({ ...prev, ...partial }));
  }, []);

  const setCreationMode = useCallback(
    (mode) => {
      replace({ ...doc, creationMode: mode });
    },
    [doc, replace]
  );

  const loadImage = useCallback(
    async (file) => {
      if (!file) return;
      setLoading(true);
      try {
        const loadedRaw = await loadRawImageFromFile(file);
        setRaw(loadedRaw);
        setImage(toAnalysisImage(loadedRaw));
        setDisplayAdjustmentsState({ ...DEFAULT_DISPLAY_ADJUSTMENTS });
        setRoiTemplate({ ...DEFAULT_ROI_TEMPLATE });
        resetHistory(createInitialDocument());
        setActiveTab('image');
      } catch (err) {
        alert(err.message || 'Failed to load image');
      } finally {
        setLoading(false);
      }
    },
    [resetHistory]
  );

  const selectRoi = useCallback(
    (roiId) => {
      replace({ ...doc, activeRoiId: roiId });
    },
    [doc, replace]
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

  const updateSessionFields = useCallback(
    (fields) => {
      replace({ ...docRef.current, ...fields });
    },
    [replace]
  );

  const setRoiUserLabel = useCallback(
    (roiId, userLabel) => {
      updateDoc((prev) => ({
        ...prev,
        rois: prev.rois.map((r) => (r.id === roiId ? { ...r, userLabel } : r)),
      }));
    },
    [updateDoc]
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

  const exportExcel = useCallback(async () => {
    await exportGelQuantExcel({
      raw,
      pairs: enrichedPairs,
      averagedRatio,
      strainName: doc.strainName ?? '',
      description: doc.description ?? '',
    });
  }, [raw, enrichedPairs, averagedRatio, doc.strainName, doc.description]);

  return {
    raw,
    image,
    displayAdjustments,
    setDisplayAdjustments,
    roiTemplate,
    setTemplate,
    loading,
    loadImage,
    activeTab,
    setActiveTab,
    pairs: enrichedPairs,
    rois: roisWithMeasurements,
    activeRoi,
    activeRoiId: doc.activeRoiId,
    creationMode: doc.creationMode,
    setCreationMode,
    incompletePair,
    strainName: doc.strainName ?? '',
    description: doc.description ?? '',
    averagedRatio,
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
    CREATION_MODES,
    ROI_ROLES,
    ROI_GEOMETRY,
  };
}
