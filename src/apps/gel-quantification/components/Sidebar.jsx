import { useRef } from 'react';
import { IMAGE_FILE_ACCEPT } from '../../../shared/image/constants';

function TemplateField({ label, value, onChange }) {
  return (
    <label className="gq-template-field">
      <span className="gq-template-field__label">{label}</span>
      <input
        type="number"
        className="gq-sidebar__input gq-template-field__input"
        min={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export default function Sidebar({
  raw,
  loading,
  displayAdjustments,
  roiTemplate,
  pairCount,
  completePairCount,
  strainName,
  description,
  onLoadImage,
  onDisplayAdjustmentsChange,
  onTemplateChange,
  onSessionFieldsChange,
  onExport,
}) {
  const fileRef = useRef(null);

  return (
    <aside className="gq-sidebar gq-sidebar--left">
      <section className="gq-sidebar__section">
        <h2 className="gq-sidebar__heading">Gel Quantification</h2>
        <p className="gq-sidebar__note">Target → Control pairs · Fiji IntDen</p>
      </section>

      <section className="gq-sidebar__section">
        <label className="gq-sidebar__label">Gel image</label>
        <button
          type="button"
          className="gq-btn gq-btn--block"
          disabled={loading}
          onClick={() => fileRef.current?.click()}
        >
          {loading ? 'Loading…' : raw ? 'Replace image' : 'Upload image'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_FILE_ACCEPT}
          className="gq-sidebar__file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onLoadImage(file);
            e.target.value = '';
          }}
        />
        {raw && (
          <p className="gq-sidebar__meta">
            {raw.name} · {raw.width}×{raw.height} · {raw.bitDepth}-bit
          </p>
        )}
        {raw && pairCount > 0 && (
          <p className="gq-sidebar__meta">
            {pairCount} pair{pairCount !== 1 ? 's' : ''} · {completePairCount} complete
          </p>
        )}
      </section>

      {raw && (
        <section className="gq-sidebar__section">
          <label className="gq-sidebar__label">ROI template (px)</label>
          <p className="gq-sidebar__hint">Centered on each click</p>
          <div className="gq-template-grid">
            <span className="gq-template-grid__heading">Inner</span>
            <TemplateField
              label="W"
              value={roiTemplate.innerWidth}
              onChange={(v) => onTemplateChange({ innerWidth: v })}
            />
            <TemplateField
              label="H"
              value={roiTemplate.innerHeight}
              onChange={(v) => onTemplateChange({ innerHeight: v })}
            />
            <span className="gq-template-grid__heading">Outer</span>
            <TemplateField
              label="W"
              value={roiTemplate.outerWidth}
              onChange={(v) => onTemplateChange({ outerWidth: v })}
            />
            <TemplateField
              label="H"
              value={roiTemplate.outerHeight}
              onChange={(v) => onTemplateChange({ outerHeight: v })}
            />
          </div>
        </section>
      )}

      {raw && (
        <section className="gq-sidebar__section">
          <label className="gq-sidebar__label">Display only</label>
          <p className="gq-sidebar__hint">(RawPixel × contrast) + brightness</p>
          <div className="gq-slider-row">
            <span className="gq-slider-label">Brightness</span>
            <input
              type="range"
              className="gq-slider"
              min={-128}
              max={128}
              value={displayAdjustments?.brightness ?? 0}
              onChange={(e) =>
                onDisplayAdjustmentsChange({ brightness: Number(e.target.value) })
              }
            />
            <span className="gq-slider-value">{displayAdjustments?.brightness ?? 0}</span>
          </div>
          <div className="gq-slider-row">
            <span className="gq-slider-label">Contrast</span>
            <input
              type="range"
              className="gq-slider"
              min={0.25}
              max={4}
              step={0.05}
              value={displayAdjustments?.contrast ?? 1}
              onChange={(e) =>
                onDisplayAdjustmentsChange({ contrast: Number(e.target.value) })
              }
            />
            <span className="gq-slider-value">
              {(displayAdjustments?.contrast ?? 1).toFixed(2)}
            </span>
          </div>
        </section>
      )}

      {raw && (
        <section className="gq-sidebar__section gq-sidebar__section--session-meta">
          <label className="gq-sidebar__label">Session metadata</label>
          <p className="gq-sidebar__hint">Applies to this gel experiment</p>
          <label className="gq-sidebar__field">
            <span className="gq-sidebar__field-label">Strain name</span>
            <input
              type="text"
              className="gq-sidebar__input"
              placeholder="e.g. WT, ΔmutA"
              value={strainName}
              onChange={(e) => onSessionFieldsChange({ strainName: e.target.value })}
            />
          </label>
          <label className="gq-sidebar__field">
            <span className="gq-sidebar__field-label">Description</span>
            <textarea
              className="gq-sidebar__textarea"
              rows={3}
              placeholder="Experiment notes…"
              value={description}
              onChange={(e) => onSessionFieldsChange({ description: e.target.value })}
            />
          </label>
        </section>
      )}

      <section className="gq-sidebar__section gq-sidebar__section--grow" />

      <section className="gq-sidebar__section">
        <button
          type="button"
          className="gq-btn gq-btn--primary gq-btn--block"
          disabled={!raw || completePairCount === 0}
          onClick={onExport}
        >
          Export Excel
        </button>
      </section>
    </aside>
  );
}
