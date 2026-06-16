import { useRef, useState, useMemo } from 'react';
import { useExperiment } from './hooks/useExperiment';
import UploadZone from './components/UploadZone';
import OverviewTab from './components/OverviewTab/OverviewTab';
import RawDataTab from './components/RawDataTab/RawDataTab';
import AveragedTab from './components/AveragedTab/AveragedTab';
import DDCtTab from './components/DDCtTab/DDCtTab';
import StandardCurveTab from './components/StandardCurveTab/StandardCurveTab';
import TimeCourseTab from './components/TimeCourseTab/TimeCourseTab';
import FormulasPanel, { FormulasButton } from './components/FormulasPanel';
import { exportQPCRInsightExcel } from './utils/exportExcel';
import { computeTargetRatio, normalizeToT0 } from './utils/parseTimeCourse';
import { useToolSnapshot } from '../../shared/persistence/useToolSnapshot';
import { NAV_ITEMS } from './constants/theme';
import ToolHeader from '../../shared/ui/ToolHeader';
import LtTabs from '../../shared/ui/LtTabs';
import ToolActionBar from '../../shared/ui/ToolActionBar';
import './qpcr-insight.css';

export default function QPCRInsightApp({ instanceId, initialState = null }) {
  const fileInputRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [formulasOpen, setFormulasOpen] = useState(false);
  const {
    experiment,
    loading,
    error,
    activeTab,
    setActiveTab,
    loadFile,
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
  } = useExperiment(initialState);

  useToolSnapshot(instanceId, 'qpcr-analyzer', getSnapshot);

  const handleUploadNew = () => {
    fileInputRef.current?.click();
  };

  const handleNewFile = async (file) => {
    await loadFile(file);
  };

  const handleExportExcel = async () => {
    if (!experiment || exporting) return;
    setExporting(true);
    try {
      let timeCourseExport = null;
      if (timeCourseData) {
        const t0Timepoint = timeCourseData.timepoints[0];
        const timeUnit = 'h';
        const ratioTargetA = timeCourseData.targets[0];
        const ratioTargetB = timeCourseData.targets[1];
        const normalizedData = normalizeToT0(timeCourseData.data, t0Timepoint);
        const ratioData =
          ratioTargetA && ratioTargetB
            ? computeTargetRatio(normalizedData, ratioTargetA, ratioTargetB)
            : [];
        timeCourseExport = {
          normalizedData,
          ratioData,
          t0Timepoint,
          timeUnit,
          ratioTargetA,
          ratioTargetB,
          sampleColors,
          hasDilutionData: timeCourseData.hasDilutionData ?? true,
        };
      } else if (referenceGene && ddCtResults) {
        timeCourseExport = { skipped: true };
      }

      await exportQPCRInsightExcel({
        experiment,
        averagedData,
        ddCtResults,
        standardCurves,
        sampleColors,
        referenceGene,
        calibratorSample,
        timeCourseExport,
      });
    } finally {
      setExporting(false);
    }
  };

  const tabs = useMemo(
    () =>
      NAV_ITEMS.map(({ id, label }) => {
        const isStandardCurve = id === 'standard-curve';
        const isTimeCourse = id === 'time-course';
        const disabled =
          (isStandardCurve && standardCurveSeries.length === 0) ||
          (isTimeCourse && !timeCourseData);

        let title;
        if (isStandardCurve && disabled) {
          title = "No dilution series detected in sample names (e.g. '1:10', '1:100').";
        } else if (isTimeCourse && disabled) {
          title =
            "Select a reference gene in the ΔΔCt tab first, and ensure sample names include a time point prefix.";
        }

        return { id, label, disabled, title };
      }),
    [standardCurveSeries.length, timeCourseData]
  );

  if (!experiment) {
    return (
      <div className="qpcr-insight qpcr-insight--upload">
        <UploadZone
          loading={loading}
          error={error}
          onFileSelect={loadFile}
          onDismissError={dismissError}
        />
        <div className="qi-upload-formulas">
          <FormulasButton onClick={() => setFormulasOpen(true)} />
        </div>
        <FormulasPanel open={formulasOpen} onClose={() => setFormulasOpen(false)} />
      </div>
    );
  }

  const experimentName =
    experiment.runInfo?.experimentName ||
    experiment.fileName.replace(/\.[^.]+$/, '');

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            experiment={experiment}
            uniqueTargets={uniqueTargets}
            uniqueSamples={uniqueSamples}
            sampleColors={sampleColors}
            targetColors={targetColors}
          />
        );
      case 'raw-data':
        return (
          <RawDataTab
            replicates={experiment.replicates}
            uniqueSamples={uniqueSamples}
            uniqueTargets={uniqueTargets}
            sampleColors={sampleColors}
            outlierIds={outlierIds}
            hasWellColumn={hasWellColumn}
          />
        );
      case 'averaged':
        return (
          <AveragedTab
            replicates={experiment.replicates}
            averagedData={averagedData}
            sampleColors={sampleColors}
            outlierIds={outlierIds}
          />
        );
      case 'ddct':
        return (
          <DDCtTab
            uniqueTargets={uniqueTargets}
            uniqueSamples={uniqueSamples}
            referenceGene={referenceGene}
            calibratorSample={calibratorSample}
            onReferenceGeneChange={setReferenceGene}
            onCalibratorSampleChange={setCalibratorSample}
            ddCtResults={ddCtResults}
            averagedData={averagedData}
            sampleColors={sampleColors}
          />
        );
      case 'time-course':
        return (
          <TimeCourseTab timeCourseData={timeCourseData} referenceGene={referenceGene} />
        );
      case 'standard-curve':
        return <StandardCurveTab averagedData={averagedData} />;
      default:
        return null;
    }
  };

  return (
    <div className="qpcr-insight">
      <ToolHeader
        title="qPCR Analysis"
        subtitle={experimentName}
        actions={<FormulasButton onClick={() => setFormulasOpen(true)} />}
      />

      <LtTabs
        tabs={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
        ariaLabel="qPCR analysis views"
      />

      <ToolActionBar hint={`${uniqueSamples.length} samples · ${uniqueTargets.length} targets`}>
        <button type="button" className="lt-btn" onClick={handleUploadNew}>
          Upload new file
        </button>
        <button
          type="button"
          className="lt-btn lt-btn--primary"
          onClick={handleExportExcel}
          disabled={exporting}
        >
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
      </ToolActionBar>

      <div className="qpcr-insight__content">{renderTab()}</div>

      <FormulasPanel open={formulasOpen} onClose={() => setFormulasOpen(false)} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".eds,.xlsx,.xls"
        className="qpcr-insight__hidden-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleNewFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
