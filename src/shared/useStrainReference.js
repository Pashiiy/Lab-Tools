import { useState, useMemo, useCallback } from 'react';
import defaultStrains from './data/strains.json';
import { strainRecordId, strainSearchText } from './strainSearch';

const ADMIN_KEY = 'lab-tools-strain-admin';
const OVERRIDE_KEY = 'lab-tools-strain-overrides';

function readOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isAdminMode() {
  try {
    return localStorage.getItem(ADMIN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useStrainReference() {
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [adminMode, setAdminMode] = useState(isAdminMode);
  const [overrides, setOverrides] = useState(() => readOverrides());

  const strains = useMemo(() => overrides ?? defaultStrains, [overrides]);

  const allTags = useMemo(() => {
    const tags = new Set();
    strains.forEach((s) => s.tags?.forEach((t) => tags.add(t)));
    return [...tags].sort();
  }, [strains]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return strains.filter((s) => {
      if (tagFilter && !(s.tags || []).includes(tagFilter)) return false;
      if (!q) return true;
      return strainSearchText(s).includes(q);
    });
  }, [strains, search, tagFilter]);

  const toggleExpanded = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const copyGenotype = useCallback(async (genotype) => {
    try {
      await navigator.clipboard.writeText(genotype);
      return true;
    } catch {
      return false;
    }
  }, []);

  const enableAdmin = useCallback(() => {
    localStorage.setItem(ADMIN_KEY, 'true');
    setAdminMode(true);
  }, []);

  const disableAdmin = useCallback(() => {
    localStorage.removeItem(ADMIN_KEY);
    setAdminMode(false);
  }, []);

  const saveStrains = useCallback((nextStrains) => {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(nextStrains));
    setOverrides(nextStrains);
  }, []);

  const resetToDefault = useCallback(() => {
    localStorage.removeItem(OVERRIDE_KEY);
    setOverrides(null);
  }, []);

  return {
    strains,
    filtered,
    search,
    setSearch,
    tagFilter,
    setTagFilter,
    allTags,
    expandedId,
    toggleExpanded,
    copyGenotype,
    adminMode,
    enableAdmin,
    disableAdmin,
    saveStrains,
    resetToDefault,
    strainRecordId,
  };
}
