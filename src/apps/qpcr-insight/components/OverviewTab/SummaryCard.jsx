import {
  getUniqueSamples,
  getUniqueTargets,
  getUniqueWells,
} from '../../utils/experimentStats';

export default function SummaryCard({ experiment }) {
  const { replicates, fileName, source, runInfo } = experiment;
  const targets = getUniqueTargets(replicates);
  const samples = getUniqueSamples(replicates);
  const wellsUsed = getUniqueWells(replicates);
  const displayName = runInfo?.experimentName || fileName.replace(/\.[^.]+$/, '');

  return (
    <section className="qi-card qi-summary-card">
      <h2 className="qi-summary-card__name">{displayName}</h2>
      <p className="qi-summary-card__source">
        Source: QuantStudio {source === 'eds' ? '.eds file' : 'Excel export'}
      </p>
      <dl className="qi-summary-card__stats">
        <div>
          <dt>Targets</dt>
          <dd>{targets.join(', ') || '—'}</dd>
        </div>
        <div>
          <dt>Samples</dt>
          <dd className="qi-mono">{samples.length}</dd>
        </div>
        <div>
          <dt>Replicates</dt>
          <dd className="qi-mono">{replicates.length}</dd>
        </div>
        <div>
          <dt>Wells used</dt>
          <dd className="qi-mono">{wellsUsed || '—'}</dd>
        </div>
      </dl>
    </section>
  );
}
