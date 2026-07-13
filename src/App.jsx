import { useMemo } from 'react';
import AppShell from './shell/AppShell';
import ResearchProjectShell from './research/ResearchProjectShell';
import { getLaunchMode, isElectronApp } from './shared/launchMode';

export default function App() {
  const { mode, projectId } = useMemo(() => getLaunchMode(), []);

  if (mode === 'research') {
    if (!isElectronApp()) {
      return (
        <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h1>Research Projects</h1>
          <p>Research Project Mode is available in the Benchy desktop app only.</p>
        </div>
      );
    }
    return <ResearchProjectShell projectId={projectId} />;
  }

  return <AppShell />;
}
