import { useState } from 'react';
import GelImagePane from './GelImagePane';
import ColonyListPane from './ColonyListPane';
import './ScoreGelsView.css';

const GEL_LABELS = {
  galcen: 'GalCen',
  cen3: 'Cen3',
  rearrangement: 'Rearrangement',
  reciprocal: 'Reciprocal',
};

export default function ScoreGelsView({
  gels,
  colonies,
  colonyCount,
  onUpload,
  onClearError,
  onUpdateAdjustment,
  onResetAdjustments,
  onToggle,
}) {
  const [activeGel, setActiveGel] = useState('galcen');
  const gel = gels[activeGel];

  return (
    <div className="score-gels-view">
      <GelImagePane
        label={GEL_LABELS[activeGel]}
        gel={gel}
        onUpload={(file) => onUpload(activeGel, file)}
        onClearError={() => onClearError(activeGel)}
        onUpdate={(field, value) => onUpdateAdjustment(activeGel, field, value)}
        onReset={() => onResetAdjustments(activeGel)}
      />
      <ColonyListPane
        gels={gels}
        colonies={colonies}
        colonyCount={colonyCount}
        activeGel={activeGel}
        onGelChange={setActiveGel}
        onToggle={onToggle}
      />
    </div>
  );
}
