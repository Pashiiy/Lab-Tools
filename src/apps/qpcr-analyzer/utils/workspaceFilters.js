import { TARGET_PALETTE, SAMPLE_PALETTE } from '../constants/palette';

const WELL_HUES = [
  '#58A6FF', '#3FB950', '#D29922', '#F85149', '#A78BFA',
  '#2DD4BF', '#F472B6', '#FB923C', '#60A5FA', '#4ADE80',
];

export function wellMatchesFilters(well, filterSamples, filterTargets) {
  const sampleOk =
    filterSamples.size === 0 ||
    filterSamples.has(well.sampleName) ||
    (well.sampleName === '' && filterSamples.has('(Empty)'));

  if (!sampleOk) return false;
  if (well.reactions.length === 0) return filterTargets.size === 0;
  if (filterTargets.size === 0) return true;
  return well.reactions.some((r) => filterTargets.has(r.targetName));
}

export function getFilterHighlightedWells(experiment, filterSamples, filterTargets) {
  if (!experiment) return new Set();
  const highlighted = new Set();
  experiment.wells.forEach((well) => {
    if (wellMatchesFilters(well, filterSamples, filterTargets)) {
      highlighted.add(well.index);
    }
  });
  return highlighted;
}

export function getVisibleSeries(
  experiment,
  filterSamples,
  filterTargets,
  plateSelectedWells
) {
  if (!experiment) return [];
  const series = [];

  experiment.wells.forEach((well) => {
    if (plateSelectedWells.size > 0 && !plateSelectedWells.has(well.index)) {
      return;
    }
    if (!wellMatchesFilters(well, filterSamples, filterTargets)) return;

    well.reactions.forEach((reaction) => {
      if (filterTargets.size > 0 && !filterTargets.has(reaction.targetName)) {
        return;
      }
      series.push({
        wellIndex: well.index,
        position: well.position,
        sampleName: well.sampleName,
        targetName: reaction.targetName,
        task: reaction.task,
        reaction,
        key: `${well.index}-${reaction.targetName}`,
      });
    });
  });

  return series;
}

export function getWellType(well) {
  if (!well.reactions.length) return 'empty';
  if (well.reactions.some((r) => /ntc|no.?template/i.test(String(r.task || '')))) {
    return 'ntc';
  }
  if (well.reactions.some((r) => /standard/i.test(String(r.task || '')))) {
    return 'standard';
  }
  return 'unknown';
}

export function getSeriesColor(series, colorBy, sampleColors, targetColors) {
  if (colorBy === 'sample') {
    return sampleColors[series.sampleName] || '#888';
  }
  if (colorBy === 'well') {
    return WELL_HUES[series.wellIndex % WELL_HUES.length];
  }
  return targetColors[series.targetName] || '#888';
}

export function getPlateWellColor(
  well,
  plateColorBy,
  sampleColors,
  targetColors,
  plateSelectedWells,
  filterHighlighted
) {
  if (plateColorBy === 'selection') {
    if (plateSelectedWells.has(well.index)) return '#FFFFFF';
    if (filterHighlighted.has(well.index)) return 'rgba(88,166,255,0.35)';
    return '#2A2D35';
  }
  if (plateColorBy === 'wellType') {
    const type = getWellType(well);
    if (type === 'ntc') return '#8B949E';
    if (type === 'standard') return '#D29922';
    if (type === 'empty') return '#2A2D35';
    return '#58A6FF';
  }
  if (plateColorBy === 'sample') {
    return sampleColors[well.sampleName] || '#2A2D35';
  }
  const target = well.reactions[0]?.targetName;
  if (well.reactions.length > 1) return null;
  return target ? targetColors[target] || '#2A2D35' : '#2A2D35';
}

export function toggleSetItem(set, item) {
  const next = new Set(set);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}

export function computeSelectionStats(series, liveCtLookup, omittedWells) {
  const groups = {};
  series.forEach((s) => {
    const omitKey = s.key;
    if (omittedWells.has(omitKey)) return;
    const gKey = `${s.sampleName}||${s.targetName}`;
    const ct = liveCtLookup[omitKey] ?? s.reaction.cq;
    if (!groups[gKey]) {
      groups[gKey] = { sampleName: s.sampleName, targetName: s.targetName, cts: [] };
    }
    if (ct !== null && ct !== undefined) groups[gKey].cts.push(ct);
  });

  return Object.values(groups).map((g) => {
    const n = g.cts.length;
    const mean = n ? g.cts.reduce((a, b) => a + b, 0) / n : null;
    const sd =
      n > 1
        ? Math.sqrt(g.cts.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))
        : null;
    return { ...g, n, meanCt: mean, sd };
  });
}
