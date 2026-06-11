import { useState, useCallback, useMemo, useEffect } from 'react';
import { classifyColony, REPAIR_CATEGORIES, REPAIR_PRODUCTS } from '../constants/categories';
import {
  buildSessionObject,
  getAutosaveKey,
  normalizeGels,
  validateSession,
} from '../utils/session';
import { loadImageForTool } from '../../../shared/image/rawImageStore';
import { createDefaultDisplayDataUrl } from '../../../shared/image/displayRenderer';

export const DEFAULT_GEL_ADJUSTMENTS = {
  brightness: 100,
  contrast: 100,
  shadows: 0,
  rotation: 90,
  zoom: 100,
  panX: 0,
  panY: 0,
};

function createEmptyGel() {
  return { src: null, name: null, ...DEFAULT_GEL_ADJUSTMENTS };
}

function createInitialGels() {
  return {
    galcen: createEmptyGel(),
    cen3: createEmptyGel(),
    rearrangement: createEmptyGel(),
    reciprocal: createEmptyGel(),
  };
}

function createColony(id) {
  return {
    id,
    galcen: 0,
    cen3: 0,
    rearrangement: 0,
    reciprocal: 0,
  };
}

function createColonies(count) {
  return Array.from({ length: count }, (_, i) => createColony(i + 1));
}

function resizeColonies(colonies, newCount) {
  if (newCount === colonies.length) return colonies;
  if (newCount < colonies.length) return colonies.slice(0, newCount);
  const additional = Array.from({ length: newCount - colonies.length }, (_, i) =>
    createColony(colonies.length + i + 1)
  );
  return [...colonies, ...additional];
}

export function useEndpointAnalysis(instanceId) {
  const autosaveKey = getAutosaveKey(instanceId);
  const [strainName, setStrainName] = useState('');
  const [colonyCount, setColonyCount] = useState(30);
  const [gels, setGels] = useState(createInitialGels);
  const [colonies, setColonies] = useState(() => createColonies(30));
  const [activeTab, setActiveTab] = useState('score-gels');
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);

  const getSessionSnapshot = useCallback(
    () =>
      buildSessionObject({
        strainName,
        colonyCount,
        gels,
        colonies,
        activeTab,
      }),
    [strainName, colonyCount, gels, colonies, activeTab]
  );

  const applySession = useCallback(
    (session) => {
      if (!validateSession(session)) return false;

      const count = Math.max(1, Math.min(999, session.colonyCount ?? 30));
      setStrainName(session.strainName ?? '');
      setColonyCount(count);
      setColonies(resizeColonies(session.colonies ?? [], count));
      setGels(normalizeGels(session.gels));
      setActiveTab(session.activeTab === 'overview' ? 'overview' : 'score-gels');
      localStorage.removeItem(autosaveKey);
      return true;
    },
    [autosaveKey]
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
    const snapshot = getSessionSnapshot();
    if (!validateSession(snapshot)) return;
    localStorage.setItem(autosaveKey, JSON.stringify(snapshot));
  }, [autosaveKey, getSessionSnapshot]);

  const handleColonyCountChange = useCallback((count) => {
    const parsed = Math.max(1, Math.min(999, parseInt(count, 10) || 1));
    setColonyCount(parsed);
    setColonies((prev) => resizeColonies(prev, parsed));
  }, []);

  const toggleColonyScore = useCallback((colonyId, field, value) => {
    setColonies((prev) =>
      prev.map((colony) =>
        colony.id === colonyId ? { ...colony, [field]: value } : colony
      )
    );
  }, []);

  const uploadGel = useCallback(async (key, file) => {
    try {
      const loaded = await loadImageForTool(file);
      const displaySrc = createDefaultDisplayDataUrl(loaded.raw);
      setGels((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          src: displaySrc,
          name: loaded.name,
          bitDepth: loaded.bitDepth,
        },
      }));
    } catch (err) {
      alert(err.message || 'Failed to load image');
    }
  }, []);

  const removeGel = useCallback((key) => {
    setGels((prev) => ({
      ...prev,
      [key]: createEmptyGel(),
    }));
  }, []);

  const updateGelAdjustment = useCallback((gelKey, field, value) => {
    setGels((prev) => {
      const updated = { ...prev[gelKey], [field]: value };
      if (field === 'zoom' && value === 100) {
        updated.panX = 0;
        updated.panY = 0;
      }
      return { ...prev, [gelKey]: updated };
    });
  }, []);

  const resetGelAdjustments = useCallback((gelKey) => {
    setGels((prev) => ({
      ...prev,
      [gelKey]: { ...prev[gelKey], ...DEFAULT_GEL_ADJUSTMENTS },
    }));
  }, []);

  const classifiedColonies = useMemo(
    () =>
      colonies.map((colony) => ({
        ...colony,
        classification: classifyColony(colony),
      })),
    [colonies]
  );

  const classifiedCount = useMemo(
    () =>
      colonies.filter((c) => {
        const { categoryId } = classifyColony(c);
        return categoryId && categoryId !== '?';
      }).length,
    [colonies]
  );

  const classifiedCounts = useMemo(() => {
    const counts = {};
    colonies.forEach((colony) => {
      const { repairProduct } = classifyColony(colony);
      if (repairProduct === 'UNCLASSIFIED') return;
      counts[repairProduct] = (counts[repairProduct] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([repairProduct, count]) => ({ repairProduct, count }))
      .sort((a, b) => b.count - a.count);
  }, [colonies]);

  const stackedBarData = useMemo(() => {
    const entries = classifiedCounts.filter((e) => e.repairProduct !== 'UNCLASSIFIED');
    const total = entries.reduce((sum, e) => sum + e.count, 0);

    if (total === 0) return null;

    const dataPoint = { name: 'Distribution' };
    let running = 0;
    entries.forEach(({ repairProduct, count }, index) => {
      if (index === entries.length - 1) {
        dataPoint[repairProduct] = parseFloat((100 - running).toFixed(1));
      } else {
        const pct = parseFloat(((count / total) * 100).toFixed(1));
        dataPoint[repairProduct] = pct;
        running += pct;
      }
    });
    return [dataPoint];
  }, [classifiedCounts]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    REPAIR_CATEGORIES.forEach((cat) => {
      counts[cat.id] = 0;
    });
    colonies.forEach((colony) => {
      const { categoryId } = classifyColony(colony);
      if (categoryId && categoryId !== '?') {
        counts[categoryId] = (counts[categoryId] || 0) + 1;
      }
    });
    return REPAIR_CATEGORIES.map((cat) => ({
      categoryId: cat.id,
      repairProduct: cat.repairProduct,
      count: counts[cat.id] || 0,
    })).filter((e) => e.count > 0);
  }, [colonies]);

  const categoryBreakdown = useMemo(() => {
    const counts = {};
    REPAIR_CATEGORIES.forEach((cat) => {
      counts[cat.id] = 0;
    });
    colonies.forEach((colony) => {
      const { categoryId } = classifyColony(colony);
      if (categoryId && categoryId !== '?') {
        counts[categoryId] = (counts[categoryId] || 0) + 1;
      }
    });

    const grouped = {};
    REPAIR_CATEGORIES.forEach((cat) => {
      if (!grouped[cat.repairProduct]) {
        grouped[cat.repairProduct] = { repairProduct: cat.repairProduct };
      }
      grouped[cat.repairProduct][cat.id] = counts[cat.id] || 0;
    });
    return Object.values(grouped);
  }, [colonies]);

  const summaryCounts = useMemo(() => {
    const counts = Object.fromEntries(REPAIR_PRODUCTS.map((p) => [p, 0]));
    let classifiedTotal = 0;

    classifiedColonies.forEach(({ classification }) => {
      const { categoryId, repairProduct } = classification;
      if (categoryId && categoryId !== '?') {
        counts[repairProduct] = (counts[repairProduct] || 0) + 1;
        classifiedTotal += 1;
      } else if (categoryId === '?') {
        counts.UNCLASSIFIED += 1;
      }
    });

    return { counts, classifiedTotal };
  }, [classifiedColonies]);

  const exportCsv = useCallback(() => {
    const rows = [
      'Colony,GalCen,Cen3,Rearrangement,Reciprocal,Category,Repair Product',
    ];

    classifiedColonies.forEach((colony) => {
      const { classification } = colony;
      const category =
        classification.categoryId === '?' ? '!' : classification.categoryId;
      rows.push(
        [
          colony.id,
          colony.galcen,
          colony.cen3,
          colony.rearrangement,
          colony.reciprocal,
          category,
          classification.repairProduct,
        ].join(',')
      );
    });

    rows.push(',,,,,,');
    rows.push('SUMMARY,,,,,,');
    rows.push(`Strain,${strainName || ''},,,,,`);

    const { counts, classifiedTotal } = summaryCounts;
    const classifiedProducts = REPAIR_PRODUCTS.filter((p) => p !== 'UNCLASSIFIED');

    classifiedProducts.forEach((product) => {
      const count = counts[product] || 0;
      const pct =
        classifiedTotal > 0
          ? `${((count / classifiedTotal) * 100).toFixed(1)}%`
          : '0.0%';
      rows.push(`${product},${count},${pct},,,,`);
    });

    const unclassifiedCount = counts.UNCLASSIFIED || 0;
    rows.push(`UNCLASSIFIED,${unclassifiedCount},,,,,`);

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${strainName || 'endpoint'}_analysis.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [classifiedColonies, strainName, summaryCounts]);

  return {
    strainName,
    setStrainName,
    colonyCount,
    setColonyCount: handleColonyCountChange,
    gels,
    colonies: classifiedColonies,
    classifiedCount,
    summaryCounts,
    toggleColonyScore,
    uploadGel,
    removeGel,
    updateGelAdjustment,
    resetGelAdjustments,
    exportCsv,
    classifiedCounts,
    stackedBarData,
    categoryCounts,
    categoryBreakdown,
    activeTab,
    setActiveTab,
    showRestorePrompt,
    pendingRestore,
    restoreAutosave,
    discardAutosave,
  };
}
