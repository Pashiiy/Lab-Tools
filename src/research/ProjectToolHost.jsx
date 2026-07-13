import { useEffect, useRef } from 'react';
import { TOOLS } from '../shell/toolRegistry';
import {
  collectToolStates,
  subscribeToolChange,
} from '../shared/persistence/toolSnapshotRegistry';

/**
 * Embeds an existing analysis tool inside Research Project Mode.
 * Tools keep their UI + useToolSnapshot; we listen for changes and
 * persist the snapshot into the research project via onStateChange.
 */
export default function ProjectToolHost({
  toolId,
  instanceId,
  initialState,
  onStateChange,
}) {
  const Tool = TOOLS[toolId]?.component;
  const onChangeRef = useRef(onStateChange);
  onChangeRef.current = onStateChange;

  useEffect(() => {
    let timer = null;
    const flush = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const tools = collectToolStates();
        const entry = tools[instanceId];
        if (entry?.state != null && onChangeRef.current) {
          onChangeRef.current(entry.state);
        }
      }, 900);
    };
    const unsub = subscribeToolChange(flush);
    return () => {
      clearTimeout(timer);
      unsub();
      // Final flush on unmount
      const tools = collectToolStates();
      const entry = tools[instanceId];
      if (entry?.state != null && onChangeRef.current) {
        onChangeRef.current(entry.state);
      }
    };
  }, [instanceId]);

  if (!Tool) {
    return <p className="research-empty">Unknown tool: {toolId}</p>;
  }

  return (
    <div className="project-tool-host">
      <Tool
        instanceId={instanceId}
        isActive
        initialState={initialState ?? null}
      />
    </div>
  );
}
