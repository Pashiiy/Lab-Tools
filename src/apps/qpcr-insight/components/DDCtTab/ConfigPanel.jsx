import { useState } from 'react';

export default function ConfigPanel({
  uniqueTargets,
  uniqueSamples,
  referenceGene,
  calibratorSample,
  onReferenceGeneChange,
  onCalibratorSampleChange,
}) {
  const [optionalOpen, setOptionalOpen] = useState(false);

  return (
    <section className="qi-card qi-ddct-config">
      <label className="qi-ddct-config__field">
        <span>Reference gene (housekeeping)</span>
        <select value={referenceGene} onChange={(e) => onReferenceGeneChange(e.target.value)}>
          <option value="">Select a gene…</option>
          {uniqueTargets.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <p className="qi-ddct-info">
        Every sample is normalized to its own {referenceGene || 'reference gene'} measurement,
        giving an RQ value comparable across all your samples.
      </p>

      <div className="qi-ddct-config__divider" />

      <button
        type="button"
        className="qi-ddct-config__disclosure"
        onClick={() => setOptionalOpen((v) => !v)}
        aria-expanded={optionalOpen}
      >
        <span aria-hidden>{optionalOpen ? '▾' : '▸'}</span>
        Compare to a specific sample (optional)
      </button>

      {optionalOpen && (
        <div className="qi-ddct-config__optional">
          <label className="qi-ddct-config__field">
            <span>Calibrator sample</span>
            <select
              value={calibratorSample}
              onChange={(e) => onCalibratorSampleChange(e.target.value)}
            >
              <option value="">None</option>
              {uniqueSamples.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <p className="qi-ddct-config__optional-hint">
            Adds ΔΔCt and Fold Change columns showing how each sample compares to the one you
            pick.
          </p>
        </div>
      )}
    </section>
  );
}
