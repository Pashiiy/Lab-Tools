import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { loadExperiment } from '../utils/loadExperiment';
import { assignSampleColors } from '../utils/sampleColors';
import { assignColors, TARGET_PALETTE } from '../constants/theme';
import { getUniqueSamples, getUniqueTargets } from '../utils/experimentStats';
import { flagOutliers } from '../utils/flagOutliers';
import { computeAveraged } from '../utils/computeAveraged';
import { computeDDCt } from '../utils/computeDDCt';
import { getDefaultReferenceGene } from '../utils/ddctDefaults';
import { detectStandardCurveSeries } from '../utils/parseDilutions';
import { prepareCurveGroups } from '../utils/standardCurve';
import { buildTimeCourseData } from '../utils/parseTimeCourse';
import { trackRecentFile } from '../../../shared/persistence/trackRecentFile.js';
import { useOpenFileListener } from '../../../shared/persistence/useOpenFileListener.js';

export function useExperiment(initialState = null) {
  const [experiment, setExperiment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [referenceGene, setReferenceGene] = useState('');
  const [calibratorSample, setCalibratorSample] = useState('');

  // Holds a restored reference gene so the auto-default effect doesn't clobber it.
  const restoredRefGeneRef = useRef(null);

  const loadFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadExperiment(file);
      if (!data.replicates?.length) {
        throw new Error('No replicate data found in this file.');
      }
      restoredRefGeneRef.current = null;
      setExperiment(data);
      setActiveTab('overview');
      setReferenceGene('');
      setCalibratorSample('');
      trackRecentFile(file, 'qpcr-analyzer').catch(() => {});
    } catch (err) {
      setError(err.message || 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  }, []);

  useOpenFileListener('qpcr-analyzer', loadFile);

  // Hydrate from a shell-restored `.labtools` project (once on mount).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !initialState?.experiment) return;
    hydratedRef.current = true;
    restoredRefGeneRef.current = initialState.referenceGene ?? null;
    setExperiment(initialState.experiment);
    setActiveTab(initialState.activeTab ?? 'overview');
    setCalibratorSample(initialState.calibratorSample ?? '');
  }, [initialState]);

  const reset = useCallback(() => {
    setExperiment(null);
    setError(null);
    setActiveTab('overview');
    setReferenceGene('');
    setCalibratorSample('');
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const uniqueTargets = useMemo(
    () => (experiment ? getUniqueTargets(experiment.replicates) : []),
    [experiment]
  );

  const uniqueSamples = useMemo(
    () => (experiment ? getUniqueSamples(experiment.replicates) : []),
    [experiment]
  );

  const sampleColors = useMemo(
    () => (experiment ? assignSampleColors(experiment.replicates) : {}),
    [experiment]
  );

  const targetColors = useMemo(
    () => assignColors(uniqueTargets, TARGET_PALETTE),
    [uniqueTargets]
  );

  const outlierIds = useMemo(
    () => (experiment ? flagOutliers(experiment.replicates) : new Set()),
    [experiment]
  );

  const averagedData = useMemo(
    () => (experiment ? computeAveraged(experiment.replicates) : []),
    [experiment]
  );

  const hasWellColumn = useMemo(
    () => (experiment ? experiment.replicates.some((r) => r.well) : false),
    [experiment]
  );

  useEffect(() => {
    if (!experiment) {
      setReferenceGene('');
      return;
    }
    if (restoredRefGeneRef.current) {
      setReferenceGene(restoredRefGeneRef.current);
      restoredRefGeneRef.current = null;
      return;
    }
    setReferenceGene(getDefaultReferenceGene(averagedData, uniqueTargets));
  }, [experiment, averagedData, uniqueTargets]);

  const ddCtResults = useMemo(
    () =>
      computeDDCt({
        averagedData,
        referenceGene,
        calibratorSample,
      }),
    [averagedData, referenceGene, calibratorSample]
  );

  const standardCurveSeries = useMemo(
    () => (experiment ? detectStandardCurveSeries(averagedData) : []),
    [experiment, averagedData]
  );

  const standardCurves = useMemo(
    () =>
      standardCurveSeries.length
        ? prepareCurveGroups(standardCurveSeries, {
            selectedSeries: 'all',
            combineSeries: false,
          })
        : [],
    [standardCurveSeries]
  );

  const timeCourseData = useMemo(
    () => (ddCtResults ? buildTimeCourseData(ddCtResults) : null),
    [ddCtResults]
  );

  const getSnapshot = useCallback(
    () =>
      experiment
        ? { experiment, activeTab, referenceGene, calibratorSample }
        : undefined,
    [experiment, activeTab, referenceGene, calibratorSample]
  );

  return {
    experiment,
    loading,
    error,
    activeTab,
    setActiveTab,
    loadFile,
    reset,
    dismissError,
    getSnapshot,
    uniqueTargets,
    uniqueSamples,
    sampleColors,
    targetColors,
    outlierIds,
    averagedData,
    hasWellColumn,
    referenceGene,
    setReferenceGene,
    calibratorSample,
    setCalibratorSample,
    ddCtResults,
    standardCurveSeries,
    standardCurves,
    timeCourseData,
  };
}
