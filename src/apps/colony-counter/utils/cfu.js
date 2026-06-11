export function calcCFU(count, dilutionFactor, volumeMl) {
  if (!count || !dilutionFactor || !volumeMl || volumeMl <= 0) return null;
  return count / (dilutionFactor * volumeMl);
}

export function formatSciNotationParts(value) {
  if (!value || !isFinite(value) || value <= 0) return null;
  const exp = Math.floor(Math.log10(value));
  const coeff = (value / Math.pow(10, exp)).toFixed(2);
  return { coeff, exp };
}
