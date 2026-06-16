/**
 * Fiji/Excel Compatibility Mode — the canonical, single source of truth.
 *
 * This module reproduces the historical, validated workflow EXACTLY:
 *   1. Measure ROIs in Fiji/ImageJ.
 *   2. Use Fiji's IntDen values (Integrated Density).
 *   3. Apply the following Excel formulas.
 *
 * Excel formulas (verbatim — do not change without explicit approval):
 *
 *   Background =
 *       (OuterIntDen - InnerIntDen) * InnerAreaPixels
 *       / (OuterAreaPixels - InnerAreaPixels)
 *
 *   Corrected Signal = InnerIntDen - Background
 *
 *   Ratio = CorrectedSignal_A / CorrectedSignal_B
 *
 * IMPORTANT: "Background" here is the Excel intermediate — the TOTAL background
 * integrated over the inner area, NOT a per-pixel mean. Corrected subtracts it
 * directly from the inner IntDen. The whole engine routes through these
 * functions so the application is a drop-in replacement for the spreadsheet.
 */

/** Marker so the UI/exports can label outputs as produced by this exact mode. */
export const FIJI_EXCEL_COMPATIBILITY_MODE = true;

/**
 * Excel "Background" column.
 *   (OuterIntDen - InnerIntDen) * InnerArea / (OuterArea - InnerArea)
 *
 * @returns {number|null} null when (OuterArea - InnerArea) <= 0.
 */
export function excelBackground({ innerIntDen, outerIntDen, innerArea, outerArea }) {
  const denominator = outerArea - innerArea;
  if (!Number.isFinite(denominator) || denominator <= 0) return null;
  if (!Number.isFinite(innerIntDen) || !Number.isFinite(outerIntDen) || !Number.isFinite(innerArea)) {
    return null;
  }
  return ((outerIntDen - innerIntDen) * innerArea) / denominator;
}

/**
 * Excel "Corrected Signal" column.
 *   InnerIntDen - Background
 *
 * @returns {number|null}
 */
export function excelCorrected({ innerIntDen, outerIntDen, innerArea, outerArea }) {
  const background = excelBackground({ innerIntDen, outerIntDen, innerArea, outerArea });
  if (background == null) return null;
  return innerIntDen - background;
}

/**
 * Excel "Ratio" column.
 *   CorrectedSignal_A / CorrectedSignal_B
 *
 * @returns {number|null} null when divisor is 0 or inputs are not finite.
 */
export function excelRatio(correctedA, correctedB) {
  if (
    correctedA == null ||
    correctedB == null ||
    !Number.isFinite(correctedA) ||
    !Number.isFinite(correctedB) ||
    correctedB === 0
  ) {
    return null;
  }
  return correctedA / correctedB;
}
