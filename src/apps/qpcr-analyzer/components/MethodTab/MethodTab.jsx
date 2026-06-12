import ProtocolDiagram from './ProtocolDiagram';
import MethodDetailsTable from './MethodDetailsTable';

export default function MethodTab({ experiment }) {
  return (
    <div className="tab-panel method-tab">
      <ProtocolDiagram runMethod={experiment.runMethod} />
      <MethodDetailsTable runMethod={experiment.runMethod} />
    </div>
  );
}
