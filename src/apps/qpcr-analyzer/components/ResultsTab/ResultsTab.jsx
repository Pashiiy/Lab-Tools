import { useState } from 'react';
import ResultsTable from './ResultsTable';

export default function ResultsTab({
  experiment,
  liveCtLookup,
  omittedWells,
  onToggleOmit,
  uniqueSamples,
  uniqueTargets,
}) {
  const [filterTarget, setFilterTarget] = useState('');
  const [filterSample, setFilterSample] = useState('');
  const [showOmitted, setShowOmitted] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  if (!experiment) {
    return (
      <div className="tab-panel tab-placeholder">
        <p>Load an experiment file to view results.</p>
      </div>
    );
  }

  return (
    <div className="tab-panel results-tab">
      <div className="results-filters">
        <label className="filter-select">
          Filter target:
          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
          >
            <option value="">All</option>
            {uniqueTargets.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-select">
          Filter sample:
          <select
            value={filterSample}
            onChange={(e) => setFilterSample(e.target.value)}
          >
            <option value="">All</option>
            {uniqueSamples.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showOmitted}
            onChange={(e) => setShowOmitted(e.target.checked)}
          />
          Show omitted
        </label>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
          />
          Flagged only
        </label>
      </div>
      <ResultsTable
        experiment={experiment}
        liveCtLookup={liveCtLookup}
        omittedWells={omittedWells}
        onToggleOmit={onToggleOmit}
        filterTarget={filterTarget}
        filterSample={filterSample}
        showOmitted={showOmitted}
        flaggedOnly={flaggedOnly}
      />
    </div>
  );
}
