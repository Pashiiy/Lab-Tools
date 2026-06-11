import ColonyRow from './ColonyRow';

export default function DataTable({ colonies, classifiedCount, colonyCount, onToggle }) {
  const progress = colonyCount > 0 ? (classifiedCount / colonyCount) * 100 : 0;

  return (
    <div className="data-table">
      <div className="data-table__progress">
        <span className="data-table__progress-text">
          Classified: {classifiedCount} / {colonyCount}
        </span>
        <div className="data-table__progress-bar">
          <div
            className="data-table__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="data-table__scroll">
        <table className="data-table__table">
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '32%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Colony</th>
              <th>GalCen</th>
              <th>Cen3</th>
              <th>Rearrangement</th>
              <th>Reciprocal</th>
              <th>Category</th>
              <th>Repair Product</th>
            </tr>
          </thead>
          <tbody>
            {colonies.map((colony) => (
              <ColonyRow key={colony.id} colony={colony} onToggle={onToggle} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
