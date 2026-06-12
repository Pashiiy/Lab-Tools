import { useState, useMemo, useCallback, useEffect } from 'react';
import { parseQuantStudioFile } from '../utils/parseQuantStudio';
import { parseEDSFile } from '../utils/parseEDS';
import { parseXlsxFile } from '../utils/parseXlsx';
import { wellsToRawData } from '../utils/wellsToRawData';
import { applyOutlierFlags, computeAveraged } from '../utils/computeAveraged';
import { computeDDCt } from '../utils/computeDDCt';
import { computeAllCts } from '../utils/computeCt';
import { assignSampleColors, assignTargetColors } from '../constants/palette';
import { buildStandardCurveData } from '../utils/standardCurve';

function extractDefaultThresholds(experiment) {
  const initial = {};
  const globalDefault =
    experiment?.analysisSetting?.defaultCtSetting?.threshold ??
    experiment?.analysisSetting?.ctThreshold;

  experiment?.targets?.forEach((target) => {
    const firstWell = experiment.wells.find((w) =>
      w.reactions.some((r) => r.targetName === target && r.ctThreshold != null)
    );
    const thresh = firstWell?.reactions.find(
      (r) => r.targetName === target
    )?.ctThreshold;
    initial[target] = thresh ?? globalDefault ?? 0.2;
  });
  return initial;
}

export function useQPCRData() {
  const [experiment, setExperiment] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(null);
  const [referenceGene, setReferenceGene] = useState('');
  const [controlSample, setControlSample] = useState('');
  const [activeTarget, setActiveTarget] = useState(null);
  const [selectedWells, setSelectedWells] = useState(new Set());
  const [plateSelectedWells, setPlateSelectedWells] = useState(new Set());
  const [omittedWells, setOmittedWells] = useState(new Set());
  const [thresholds, setThresholds] = useState({});
  const [defaultThresholds, setDefaultThresholds] = useState({});
  const [displayMode, setDisplayMode] = useState('Log ΔRn');
  const [colorBy, setColorBy] = useState('target');
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [filterSamples, setFilterSamples] = useState(new Set());
  const [filterTargets, setFilterTargets] = useState(new Set());
  const [chartColorBy, setChartColorBy] = useState('target');
  const [plateColorBy, setPlateColorBy] = useState('target');
  const [displayOptions, setDisplayOptions] = useState({
    amplification: true,
    melt: true,
    standardCurve: true,
    statistics: true,
  });
  const [collapsed, setCollapsed] = useState({
    plate: false,
    melt: false,
    summary: false,
    standardCurve: false,
  });
  const [dragSelecting, setDragSelecting] = useState(false);

  useEffect(() => {
    if (!experiment) return;
    const initial = extractDefaultThresholds(experiment);
    setThresholds(initial);
    setDefaultThresholds(initial);
    setActiveTarget(experiment.targets[0] ?? null);
    setSelectedWells(new Set());
    setPlateSelectedWells(new Set());
    setOmittedWells(new Set());
    setLastSelectedIndex(null);
    setDisplayMode('Log ΔRn');
    setFilterSamples(new Set());
    setFilterTargets(new Set());
    setChartColorBy('target');
    setPlateColorBy('target');
    setDisplayOptions({
      amplification: true,
      melt: true,
      standardCurve: true,
      statistics: true,
    });
    setCollapsed({ plate: false, melt: false, summary: false, standardCurve: false });
    setAdvancedMode(null);
  }, [experiment]);

  const loadFile = useCallback(async (file) => {
    setParseError(null);
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'eds') {
        const data = await parseEDSFile(buffer);
        const rows = wellsToRawData(data.wells);
        setExperiment(data);
        setRawData(rows);
        setRawHeaders([
          'Well Position',
          'Sample Name',
          'Target Name',
          'CT',
          'Amp Status',
          'Task',
        ]);
        setFileName(file.name);
        setAdvancedMode(null);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const { headers, rows } = parseQuantStudioFile(buffer);
        const withOutliers = applyOutlierFlags(rows);
        const exp = parseXlsxFile(buffer);
        setExperiment(exp);
        setRawData(withOutliers);
        setRawHeaders(headers);
        setFileName(file.name);
        setAdvancedMode(null);
      } else {
        throw new Error(
          'Unsupported file type. Please upload a .eds, .xlsx, or .xls file.'
        );
      }

      setReferenceGene('');
      setControlSample('');
    } catch (err) {
      setParseError(err.message || 'Failed to parse file');
      setExperiment(null);
      setRawData([]);
      setRawHeaders([]);
      setFileName('');
    } finally {
      setLoading(false);
    }
  }, []);

  const liveCts = useMemo(() => {
    if (!experiment || !activeTarget) return {};
    return computeAllCts(
      experiment.wells,
      activeTarget,
      thresholds[activeTarget] ?? 0.2
    );
  }, [experiment, activeTarget, thresholds]);

  const liveCtLookup = useMemo(() => {
    if (!experiment) return {};
    const lookup = {};
    experiment.targets.forEach((target) => {
      const cts = computeAllCts(
        experiment.wells,
        target,
        thresholds[target] ?? 0.2
      );
      Object.entries(cts).forEach(([idx, ct]) => {
        lookup[`${idx}-${target}`] = ct;
      });
    });
    return lookup;
  }, [experiment, thresholds]);

  const hasStandardCurve = useMemo(() => {
    if (!experiment) return false;
    if (experiment.standardCurveResult) {
      const data = buildStandardCurveData(
        experiment.standardCurveResult,
        experiment.wells,
        liveCtLookup
      );
      return data !== null;
    }
    return false;
  }, [experiment, liveCtLookup]);

  const uniqueSamples = useMemo(() => {
    const set = new Set();
    rawData.forEach((row) => {
      if (row.sampleName && !row.isNTC) set.add(row.sampleName);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rawData]);

  const uniqueTargets = useMemo(() => {
    const set = new Set();
    rawData.forEach((row) => {
      if (row.targetName) set.add(row.targetName);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rawData]);

  const sampleColors = useMemo(() => {
    const nonNtc = uniqueSamples.filter((s) => {
      const row = rawData.find((r) => r.sampleName === s);
      return row && !row.isNTC;
    });
    return assignSampleColors(nonNtc.length ? nonNtc : uniqueSamples);
  }, [rawData, uniqueSamples]);

  const targetColors = useMemo(
    () => assignTargetColors(experiment?.targets ?? uniqueTargets),
    [experiment, uniqueTargets]
  );

  const averagedData = useMemo(() => computeAveraged(rawData), [rawData]);

  const ddCtResults = useMemo(
    () => computeDDCt({ averagedData, referenceGene, controlSample }),
    [averagedData, referenceGene, controlSample]
  );

  const stats = useMemo(() => {
    const ntc = rawData.filter((r) => r.isNTC).length;
    const undetermined = rawData.filter((r) => r.isUndetermined).length;
    return {
      wells: rawData.length,
      samples: uniqueSamples.length,
      targets: uniqueTargets.length,
      ntc,
      undetermined,
    };
  }, [rawData, uniqueSamples, uniqueTargets]);

  const averagedStats = useMemo(() => {
    const highCv = averagedData.filter((g) => g.cv !== null && g.cv > 5).length;
    const withUndetermined = averagedData.filter((g) => g.undeterminedCount > 0).length;
    return {
      groups: averagedData.length,
      highCv,
      withUndetermined,
    };
  }, [averagedData]);

  const toggleWellSelection = useCallback(
    (wellIndex, shiftKey) => {
      setSelectedWells((prev) => {
        const next = new Set(prev);
        if (shiftKey && lastSelectedIndex !== null) {
          const start = Math.min(lastSelectedIndex, wellIndex);
          const end = Math.max(lastSelectedIndex, wellIndex);
          for (let i = start; i <= end; i++) next.add(i);
        } else if (next.has(wellIndex)) {
          next.delete(wellIndex);
        } else {
          next.add(wellIndex);
        }
        return next;
      });
      setLastSelectedIndex(wellIndex);
    },
    [lastSelectedIndex]
  );

  const toggleOmit = useCallback((wellIndex, targetName) => {
    const key = `${wellIndex}-${targetName}`;
    setOmittedWells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const setThreshold = useCallback((targetName, value) => {
    setThresholds((prev) => ({ ...prev, [targetName]: value }));
  }, []);

  const autoThreshold = useCallback(() => {
    setThresholds({ ...defaultThresholds });
  }, [defaultThresholds]);

  const handlePlateWellDown = useCallback(
    (wellIndex, { shiftKey, ctrlKey, metaKey }) => {
      const mod = ctrlKey || metaKey;
      setPlateSelectedWells((prev) => {
        if (shiftKey && lastSelectedIndex !== null) {
          const next = new Set(mod ? prev : new Set());
          if (!mod && prev.size) {
            prev.forEach((i) => next.add(i));
          }
          const start = Math.min(lastSelectedIndex, wellIndex);
          const end = Math.max(lastSelectedIndex, wellIndex);
          for (let i = start; i <= end; i++) next.add(i);
          setDragSelecting(false);
          return next;
        }
        if (mod) {
          const next = new Set(prev);
          if (next.has(wellIndex)) next.delete(wellIndex);
          else next.add(wellIndex);
          return next;
        }
        setDragSelecting(true);
        return new Set([wellIndex]);
      });
      setLastSelectedIndex(wellIndex);
    },
    [lastSelectedIndex]
  );

  const handlePlateWellEnter = useCallback(
    (wellIndex) => {
      if (!dragSelecting) return;
      setPlateSelectedWells((prev) => {
        const next = new Set(prev);
        next.add(wellIndex);
        return next;
      });
    },
    [dragSelecting]
  );

  const clearPlateSelection = useCallback(() => {
    setPlateSelectedWells(new Set());
    setDragSelecting(false);
  }, []);

  const endPlateDrag = useCallback(() => {
    setDragSelecting(false);
  }, []);

  const toggleCollapsed = useCallback((key) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return {
    experiment,
    rawData,
    rawHeaders,
    fileName,
    parseError,
    loading,
    advancedMode,
    setAdvancedMode,
    loadFile,
    uniqueSamples,
    uniqueTargets,
    sampleColors,
    targetColors,
    averagedData,
    stats,
    averagedStats,
    hasData: rawData.length > 0,
    referenceGene,
    controlSample,
    setReferenceGene,
    setControlSample,
    ddCtResults,
    activeTarget,
    setActiveTarget,
    selectedWells,
    plateSelectedWells,
    omittedWells,
    filterSamples,
    setFilterSamples,
    filterTargets,
    setFilterTargets,
    chartColorBy,
    setChartColorBy,
    plateColorBy,
    setPlateColorBy,
    displayOptions,
    setDisplayOptions,
    collapsed,
    toggleCollapsed,
    thresholds,
    defaultThresholds,
    setThreshold,
    autoThreshold,
    displayMode,
    setDisplayMode,
    colorBy,
    setColorBy,
    toggleWellSelection,
    toggleOmit,
    liveCts,
    liveCtLookup,
    hasStandardCurve,
    handlePlateWellDown,
    handlePlateWellEnter,
    clearPlateSelection,
    endPlateDrag,
    experimentName: experiment?.experimentName || fileName,
  };
}
