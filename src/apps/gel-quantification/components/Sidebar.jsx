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
  gelCount,
  loading,
  displayAdjustments,
  inverted,
  roiTemplate,
  pairCount,
  completePairCount,
  totalCompletePairs,
  strainName,
  description,
  onAddGel,
  onDisplayAdjustmentsChange,
  onInvertedChange,
  onTemplateChange,
  onResetTemplateDefaults,
  onSessionFieldsChange,
}) {
  const fileRef = useRef(null);

  return (
    <aside className="gq-sidebar gq-sidebar--left">
      <section className="gq-sidebar__section">
        <h2 className="gq-sidebar__heading">Gel Quantification</h2>
        <p className="gq-sidebar__note">Target → Control pairs · Fiji IntDen</p>
      </section>

      <section className="gq-sidebar__section" data-tour="gq-upload">
        <label className="gq-sidebar__label">Gel dataset</label>
        <button
          type="button"
          className="gq-btn gq-btn--block"
          disabled={loading}
          onClick={() => fileRef.current?.click()}
        >
          {loading ? 'Loading…' : raw ? 'Add gel image' : 'Upload gel image'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_FILE_ACCEPT}
          multiple
          className="gq-sidebar__file"
          onChange={async (e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            for (const file of files) {
              await onAddGel(file);
            }
          }}
        />
        {raw && (
          <p className="gq-sidebar__meta">
            {gelCount} gel{gelCount !== 1 ? 's' : ''} in session
            {pairCount > 0 && (
              <>
                {' '}
                · active: {pairCount} pair{pairCount !== 1 ? 's' : ''} ({completePairCount}{' '}
                complete)
              </>
            )}
          </p>
        )}
      </section>

      {raw && (
        <section className="gq-sidebar__section">
          <label className="gq-sidebar__label">ROI template (px)</label>
          <p className="gq-sidebar__hint">Inner band · outer background — centered on click</p>
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
          <button
            type="button"
            className="gq-btn gq-btn--block gq-sidebar__reset-template"
            onClick={onResetTemplateDefaults}
          >
            Reset to defaults (30×70 / 45×85)
          </button>
        </section>
      )}

      {raw && (
        <section className="gq-sidebar__section">
          <label className="gq-sidebar__label">Display only</label>
          <p className="gq-sidebar__hint">Does not affect quantification values</p>
          <label className="gq-sidebar__toggle">
            <input
              type="checkbox"
              checked={!!inverted}
              onChange={(e) => onInvertedChange(e.target.checked)}
            />
            <span>Invert gel</span>
          </label>
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
          <p className="gq-sidebar__hint">Applies to full dataset export</p>
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

    </aside>
  );
}
