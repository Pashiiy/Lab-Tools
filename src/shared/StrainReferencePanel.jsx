import { useState } from 'react';
import { useStrainReference } from './useStrainReference';
import { strainRecordId } from './strainSearch';
import './strain-reference.css';

function BulletSection({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="strain-ref__section">
      <h4 className="strain-ref__section-title">{title}</h4>
      <ul className="strain-ref__bullets">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function StrainReferencePanel() {
  const ref = useStrainReference();
  const [copiedId, setCopiedId] = useState(null);
  const [adminJson, setAdminJson] = useState('');
  const [adminError, setAdminError] = useState('');

  const handleCopy = async (strain) => {
    const ok = await ref.copyGenotype(strain.genotype);
    if (ok) {
      setCopiedId(strainRecordId(strain));
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const openAdminEditor = () => {
    ref.enableAdmin();
    setAdminJson(JSON.stringify(ref.strains, null, 2));
    setAdminError('');
  };

  const saveAdminJson = () => {
    try {
      const parsed = JSON.parse(adminJson);
      if (!Array.isArray(parsed)) throw new Error('Root must be an array');
      ref.saveStrains(parsed);
      setAdminError('');
    } catch (e) {
      setAdminError(e.message || 'Invalid JSON');
    }
  };

  return (
    <div className="strain-ref">
      <div className="strain-ref__search-row">
        <input
          type="search"
          className="lt-input strain-ref__search"
          placeholder="Search by ID, genotype, tag, or keyword…"
          value={ref.search}
          onChange={(e) => ref.setSearch(e.target.value)}
        />
        <select
          className="lt-input strain-ref__filter"
          value={ref.tagFilter}
          onChange={(e) => ref.setTagFilter(e.target.value)}
        >
          <option value="">All tags</option>
          {ref.allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      <p className="strain-ref__count">
        {ref.filtered.length} strain{ref.filtered.length !== 1 ? 's' : ''}
      </p>

      <ul className="strain-ref__list">
        {ref.filtered.map((strain) => {
          const id = strainRecordId(strain);
          const expanded = ref.expandedId === id;
          return (
            <li key={id} className="strain-ref__item">
              <button
                type="button"
                className="strain-ref__item-header"
                onClick={() => ref.toggleExpanded(id)}
                aria-expanded={expanded}
              >
                <span className="strain-ref__chevron">{expanded ? '▾' : '▸'}</span>
                <span className="strain-ref__id">{id}</span>
                <span className="strain-ref__name">{strain.commonName}</span>
                {strain.tags?.length > 0 && (
                  <span className="strain-ref__tag-preview">{strain.tags[0]}</span>
                )}
              </button>
              {expanded && (
                <div className="strain-ref__body">
                  <div className="strain-ref__meta-row">
                    <span className="strain-ref__meta-label">Strain ID</span>
                    <span className="strain-ref__meta-value strain-ref__meta-value--id">{id}</span>
                  </div>

                  <div className="strain-ref__genotype-row">
                    <div className="strain-ref__genotype-block">
                      <span className="strain-ref__meta-label">Genotype</span>
                      <code className="strain-ref__genotype">{strain.genotype}</code>
                    </div>
                    <button
                      type="button"
                      className="lt-btn"
                      onClick={() => handleCopy(strain)}
                    >
                      {copiedId === id ? 'Copied' : 'Copy genotype'}
                    </button>
                  </div>

                  {strain.description && (
                    <div className="strain-ref__section">
                      <h4 className="strain-ref__section-title">Description</h4>
                      <p className="strain-ref__desc">{strain.description}</p>
                    </div>
                  )}

                  <BulletSection
                    title="DNA Repair Characteristics"
                    items={strain.dnaRepairCharacteristics}
                  />
                  <BulletSection
                    title="Expected Phenotypes"
                    items={strain.expectedPhenotypes}
                  />

                  {strain.tags?.length > 0 && (
                    <div className="strain-ref__section">
                      <h4 className="strain-ref__section-title">Tags</h4>
                      <div className="strain-ref__tags">
                        {strain.tags.map((tag) => (
                          <span key={tag} className="strain-ref__tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {ref.filtered.length === 0 && (
        <p className="strain-ref__empty">No strains match your search.</p>
      )}

      <footer className="strain-ref__admin">
        {!ref.adminMode ? (
          <button type="button" className="lt-btn strain-ref__admin-btn" onClick={openAdminEditor}>
            Admin: edit strain database
          </button>
        ) : (
          <div className="strain-ref__admin-editor">
            <p className="strain-ref__admin-hint">
              Edit <code>strains.json</code> structure below. Changes persist in local storage.
            </p>
            <textarea
              className="lt-input strain-ref__admin-textarea"
              value={adminJson}
              onChange={(e) => setAdminJson(e.target.value)}
              rows={8}
            />
            {adminError && <p className="strain-ref__admin-error">{adminError}</p>}
            <div className="strain-ref__admin-actions">
              <button type="button" className="lt-btn lt-btn--primary" onClick={saveAdminJson}>
                Save
              </button>
              <button type="button" className="lt-btn" onClick={ref.resetToDefault}>
                Reset to default
              </button>
              <button type="button" className="lt-btn" onClick={ref.disableAdmin}>
                Exit admin
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
