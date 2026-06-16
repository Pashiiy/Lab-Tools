/**
 * Box-in-box background correction — Fiji/Excel Compatibility Mode.
 *
 * The application reproduces the historical Fiji + Excel workflow EXACTLY. All
 * math is delegated to ./fijiExcelWorkflow.js (the single source of truth) so
 * there is no second, divergent implementation. See that file for the verbatim
 * Excel formulas.
 *
 *   Background = (OuterIntDen - InnerIntDen) * InnerArea / (OuterArea - InnerArea)
 *   Corrected  = InnerIntDen - Background
 *   Ratio      = Corrected_A / Corrected_B
 *
 * GEOMETRY: the outer ROI is concentric with and fully contains the inner ROI,
 * so IntDen_outer includes IntDen_inner plus the surrounding frame. This matches
 * how the ROIs are measured in Fiji and entered into the spreadsheet.
 */
import { excelBackground, excelCorrected, excelRatio } from './fijiExcelWorkflow.js';

/**
 * Excel "Background" total (integrated over the inner area), not a per-pixel mean.
 * @returns {number|null}
 */
export function computeBackground({ intDenInner, intDenOuter, areaInner, areaOuter }) {
  return excelBackground({
    innerIntDen: intDenInner,
    outerIntDen: intDenOuter,
    innerArea: areaInner,
    outerArea: areaOuter,
  });
}

/**
 * Per-pixel local background (informational / diagnostic only).
 * Background / InnerArea = (OuterIntDen - InnerIntDen) / (OuterArea - InnerArea).
 * @returns {number|null}
 */
export function computeBackgroundMean({ intDenInner, intDenOuter, areaInner, areaOuter }) {
  const ringArea = areaOuter - areaInner;
  if (!Number.isFinite(ringArea) || ringArea <= 0) return null;
  return (intDenOuter - intDenInner) / ringArea;
}

/**
 * Excel "Corrected Signal" = InnerIntDen - Background.
 * @returns {number|null}
 */
export function computeCorrectedIntensity({
  intDenInner,
  intDenOuter,
  areaInner,
  areaOuter,
}) {
  return excelCorrected({
    innerIntDen: intDenInner,
    outerIntDen: intDenOuter,
    innerArea: areaInner,
    outerArea: areaOuter,
  });
}

/**
 * Excel "Ratio" = sample_corrected / control_corrected.
 */
export function computeControlRatio(sampleCorrected, controlCorrected) {
  return excelRatio(sampleCorrected, controlCorrected);
}

/**
 * Build full measurement record for a sample, including the intermediate
 * values needed for Fiji/Excel cross-checking and the diagnostic mode.
 */
export function buildSampleMeasurements(innerMeas, outerMeas) {
  const areaInner = innerMeas.area;
  const areaOuter = outerMeas.area;
  const intDenInner = innerMeas.intDen;
  const intDenOuter = outerMeas.intDen;

  const ringArea = areaOuter - areaInner;
  const background = computeBackground({ intDenInner, intDenOuter, areaInner, areaOuter });
  const backgroundMean = computeBackgroundMean({ intDenInner, intDenOuter, areaInner, areaOuter });
  const correctedIntensity = computeCorrectedIntensity({
    intDenInner,
    intDenOuter,
    areaInner,
    areaOuter,
  });

  return {
    areaInner,
    areaOuter,
    ringArea,
    meanInner: innerMeas.mean,
    meanOuter: outerMeas.mean,
    intDenInner,
    intDenOuter,
    // RawIntDen aliases: equal to IntDen for uncalibrated images (the gel case).
    rawIntDenInner: intDenInner,
    rawIntDenOuter: intDenOuter,
    minInner: innerMeas.min,
    maxInner: innerMeas.max,
    minOuter: outerMeas.min,
    maxOuter: outerMeas.max,
    background,
    backgroundMean,
    correctedIntensity,
    intDenIdentityInner: verifyPair(innerMeas),
    intDenIdentityOuter: verifyPair(outerMeas),
  };
}

function verifyPair(m) {
  if (!m.valid || m.area === 0) return true;
  return Math.abs(m.intDen - m.area * m.mean) < 1e-4;
}
