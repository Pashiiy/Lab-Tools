function Row({ label, value, unit = '' }) {
  return (
    <div className="gq-readout__row">
      <span className="gq-readout__label">{label}</span>
      <span className="gq-readout__value">
        {value}
        {unit && <span className="gq-readout__unit">{unit}</span>}
      </span>
    </div>
  );
}

function fmt(n, digits = 2) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

export default function MeasurementReadout({
  measurements,
  roiName,
  roiType,
  normalizedRatio,
}) {
  if (!measurements) {
    return (
      <div className="gq-readout gq-readout--empty">
        <p>Click a band to create an ROI</p>
        <p className="gq-readout__hint">First ROI becomes the control automatically</p>
      </div>
    );
  }

  return (
    <div className="gq-readout">
      <h3 className="gq-readout__title">
        {roiName ?? 'ROI'}
        {roiType && <span className="gq-readout__type">{roiType}</span>}
      </h3>

      <div className="gq-readout__section">
        <h4 className="gq-readout__heading">Inner</h4>
        <Row label="Area" value={measurements.areaInner} unit="px" />
        <Row label="Mean" value={fmt(measurements.meanInner, 4)} />
        <Row label="IntDen" value={fmt(measurements.intDenInner, 2)} />
      </div>

      <div className="gq-readout__section">
        <h4 className="gq-readout__heading">Outer</h4>
        <Row label="Area" value={measurements.areaOuter} unit="px" />
        <Row label="Mean" value={fmt(measurements.meanOuter, 4)} />
        <Row label="IntDen" value={fmt(measurements.intDenOuter, 2)} />
      </div>

      <div className="gq-readout__section">
        <h4 className="gq-readout__heading">Background (Excel)</h4>
        <Row label="Background" value={fmt(measurements.background, 2)} />
        <Row label="Ring area" value={measurements.ringArea ?? '—'} unit="px" />
        <Row label="Bg / px" value={fmt(measurements.backgroundMean, 4)} />
      </div>

      <div className="gq-readout__section gq-readout__section--result">
        <h4 className="gq-readout__heading">Corrected</h4>
        <Row label="Intensity" value={fmt(measurements.correctedIntensity, 4)} />
        {roiType === 'TARGET' && (
          <Row label="Normalized" value={fmt(normalizedRatio, 4)} />
        )}
      </div>
    </div>
  );
}
