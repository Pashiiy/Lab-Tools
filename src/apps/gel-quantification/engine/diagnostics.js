import { measureRectROI } from './measurements.js';
import { buildSampleMeasurements } from './boxInBox.js';

/**
 * Diagnostics for cross-checking the gel pipeline against Fiji/ImageJ.
 *
 * Fiji is the reference. For an uncalibrated image, Fiji's IntDen == RawIntDen ==
 * the raw sum of pixel values, which is exactly what `measureRectROI` returns as
 * `intDen`. This module surfaces every intermediate value so each one can be
 * compared to the matching Fiji "Measure" output, and computes percent
 * differences against user-supplied Fiji reference numbers.
 */

/** Signed percent difference of `value` relative to `reference` (Fiji = truth). */
export function percentDifference(value, reference) {
  if (
    value == null ||
    reference == null ||
    !Number.isFinite(value) ||
    !Number.isFinite(reference) ||
    reference === 0
  ) {
    return null;
  }
  return ((value - reference) / Math.abs(reference)) * 100;
}

export function absoluteError(value, reference) {
  if (value == null || reference == null || !Number.isFinite(value) || !Number.isFinite(reference)) {
    return null;
  }
  return value - reference;
}

/**
 * Build a full diagnostic report for one ROI entry (inner + outer boxes).
 *
 * @param {object} image  analysis image { pixels, width, height, bitDepth }
 * @param {object} roiEntry  { innerROI, outerROI }
 * @param {object} [fijiReference] optional known Fiji values for % difference:
 *        { intDenInner, intDenOuter, meanInner, meanOuter, corrected }
 */
export function buildRoiDiagnostics(image, roiEntry, fijiReference = null) {
  if (!image || !roiEntry) return null;

  const inner = measureRectROI(image, roiEntry.innerROI);
  const outer = measureRectROI(image, roiEntry.outerROI);
  if (!inner.valid || !outer.valid) return null;

  const m = buildSampleMeasurements(inner, outer);

  const report = {
    image: {
      width: image.width,
      height: image.height,
      bitDepth: image.bitDepth,
      name: image.name ?? null,
    },
    inner: {
      roi: inner.roi,
      area: m.areaInner,
      mean: m.meanInner,
      intDen: m.intDenInner,
      rawIntDen: m.rawIntDenInner,
      min: m.minInner,
      max: m.maxInner,
      intDenIdentityHolds: m.intDenIdentityInner,
    },
    outer: {
      roi: outer.roi,
      area: m.areaOuter,
      mean: m.meanOuter,
      intDen: m.intDenOuter,
      rawIntDen: m.rawIntDenOuter,
      min: m.minOuter,
      max: m.maxOuter,
      intDenIdentityHolds: m.intDenIdentityOuter,
    },
    background: {
      ringArea: m.ringArea,
      // Excel "Background" intermediate: (Outer - Inner) * InnerArea / (Outer - Inner area).
      background: m.background,
      backgroundMean: m.backgroundMean,
    },
    correctedIntensity: m.correctedIntensity,
  };

  if (fijiReference) {
    report.comparison = {
      intDenInner: compare(m.intDenInner, fijiReference.intDenInner),
      intDenOuter: compare(m.intDenOuter, fijiReference.intDenOuter),
      meanInner: compare(m.meanInner, fijiReference.meanInner),
      meanOuter: compare(m.meanOuter, fijiReference.meanOuter),
      corrected: compare(m.correctedIntensity, fijiReference.corrected),
    };
  }

  return report;
}

function compare(value, reference) {
  if (reference == null) return null;
  return {
    app: value,
    fiji: reference,
    absoluteError: absoluteError(value, reference),
    percentDifference: percentDifference(value, reference),
  };
}
