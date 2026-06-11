/**
 * Box-in-box background correction (experimental workflow).
 *
 * I_corrected = (I_inner - I_outer) × (A_inner / (A_outer - A_inner))
 *
 * I_inner / I_outer are Integrated Density (IntDen) values.
 */
export function computeCorrectedIntensity({
  intDenInner,
  intDenOuter,
  areaInner,
  areaOuter,
}) {
  const ringArea = areaOuter - areaInner;
  if (ringArea <= 0 || areaInner <= 0) {
    return null;
  }

  return (intDenInner - intDenOuter) * (areaInner / ringArea);
}

/**
 * Control-normalized ratio: R = sample_corrected / control_corrected
 */
export function computeControlRatio(sampleCorrected, controlCorrected) {
  if (
    sampleCorrected == null ||
    controlCorrected == null ||
    controlCorrected === 0 ||
    !Number.isFinite(controlCorrected) ||
    !Number.isFinite(sampleCorrected)
  ) {
    return null;
  }
  return sampleCorrected / controlCorrected;
}

/**
 * Build full measurement record for a sample.
 */
export function buildSampleMeasurements(innerMeas, outerMeas) {
  const correctedIntensity = computeCorrectedIntensity({
    intDenInner: innerMeas.intDen,
    intDenOuter: outerMeas.intDen,
    areaInner: innerMeas.area,
    areaOuter: outerMeas.area,
  });

  return {
    areaInner: innerMeas.area,
    areaOuter: outerMeas.area,
    meanInner: innerMeas.mean,
    meanOuter: outerMeas.mean,
    intDenInner: innerMeas.intDen,
    intDenOuter: outerMeas.intDen,
    minInner: innerMeas.min,
    maxInner: innerMeas.max,
    minOuter: outerMeas.min,
    maxOuter: outerMeas.max,
    correctedIntensity,
    intDenIdentityInner: verifyPair(innerMeas),
    intDenIdentityOuter: verifyPair(outerMeas),
  };
}

function verifyPair(m) {
  if (!m.valid || m.area === 0) return true;
  return Math.abs(m.intDen - m.area * m.mean) < 1e-4;
}
