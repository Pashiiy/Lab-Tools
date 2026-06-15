import { useCallback, useEffect, useMemo, useState } from 'react';
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

export function useExperiment() {
  const [experiment, setExperiment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [referenceGene, setReferenceGene] = useState('');
  const [calibratorSample, setCalibratorSample] = useState('');

  const loadFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadExperiment(file);
      if (!data.replicates?.length) {
        throw new Error('No replicate data found in this file.');
      }
      setExperiment(data);
      setActiveTab('overview');
      setCalibratorSample('');
    } catch (err) {
      setError(err.message || 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  return {
    experiment,
    loading,
    error,
    activeTab,
    setActiveTab,
    loadFile,
    reset,
    dismissError,
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
