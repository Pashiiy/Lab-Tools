import { useRef, useState } from 'react';
import { useExperiment } from './hooks/useExperiment';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
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
import './qpcr-insight.css';

export default function QPCRInsightApp() {
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
  } = useExperiment();

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
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        standardCurveAvailable={standardCurveSeries.length > 0}
        timeCourseAvailable={!!timeCourseData}
      />
      <div className="qpcr-insight__main">
        <Header
          experimentName={experimentName}
          onUploadNew={handleUploadNew}
          onExportExcel={handleExportExcel}
          onOpenFormulas={() => setFormulasOpen(true)}
          exporting={exporting}
        />
        <div className="qpcr-insight__content">{renderTab()}</div>
      </div>
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
