import { useCallback, useEffect, useRef, useState } from 'react';
import { getHelpContent, hasHelpContent } from './helpRegistry';
import {
  getToolOnboardingState,
  patchToolOnboardingState,
  resetToolOnboarding,
} from './onboardingStorage';
import ToolHelpButton from './components/ToolHelpButton';
import IntroModal from './components/IntroModal';
import GuidedTour from './components/GuidedTour';
import HelpPanel from './components/HelpPanel';
import WhatsNewModal from './components/WhatsNewModal';
import './onboarding.css';

/**
 * Wraps any tool panel with onboarding, help, and guided tour.
 * Content is loaded from src/help/content/{toolId}.json
 */
export default function ToolOnboardingShell({ toolId, isActive, children }) {
  const content = getHelpContent(toolId);
  const enabled = hasHelpContent(toolId);
  const promptedRef = useRef(false);

  const [introOpen, setIntroOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [helpTab, setHelpTab] = useState('overview');

  const markIntroComplete = useCallback(() => {
    if (!toolId || !content) return;
    patchToolOnboardingState(toolId, {
      introCompleted: true,
      introCompletedAt: Date.now(),
      lastSeenVersion: content.version,
    });
  }, [toolId, content]);

  const markTourComplete = useCallback(() => {
    if (!toolId) return;
    patchToolOnboardingState(toolId, { tourCompleted: true });
  }, [toolId]);

  const dismissWhatsNew = useCallback(() => {
    if (!toolId || !content) return;
    patchToolOnboardingState(toolId, { lastSeenVersion: content.version });
    setWhatsNewOpen(false);
  }, [toolId, content]);

  useEffect(() => {
    if (!isActive || !enabled || !content) return;
    if (promptedRef.current) return;

    const state = getToolOnboardingState(toolId);
    promptedRef.current = true;

    if (!state.introCompleted) {
      const timer = setTimeout(() => setIntroOpen(true), 400);
      return () => clearTimeout(timer);
    }

    if (content.version && state.lastSeenVersion !== content.version && content.whatsNew?.length) {
      const timer = setTimeout(() => setWhatsNewOpen(true), 500);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [isActive, enabled, content, toolId]);

  useEffect(() => {
    promptedRef.current = false;
  }, [toolId]);

  const openHelp = useCallback((tab = 'overview') => {
    setHelpTab(tab);
    setHelpOpen(true);
  }, []);

  const replayIntro = useCallback(() => {
    setHelpOpen(false);
    resetToolOnboarding(toolId);
    setIntroOpen(true);
  }, [toolId]);

  const startTour = useCallback(() => {
    setHelpOpen(false);
    setIntroOpen(false);
    setTourOpen(true);
  }, []);

  if (!enabled) {
    return children;
  }

  return (
    <div className="tool-onboarding-shell">
      {children}
      <ToolHelpButton onClick={() => openHelp('overview')} />
      <IntroModal
        open={introOpen}
        content={content}
        onClose={() => setIntroOpen(false)}
        onComplete={markIntroComplete}
        onStartTour={startTour}
      />
      <GuidedTour
        open={tourOpen}
        steps={content.tour ?? []}
        onClose={() => setTourOpen(false)}
        onComplete={markTourComplete}
      />
      <HelpPanel
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        content={content}
        initialTab={helpTab}
        onReplayIntro={replayIntro}
        onStartTour={startTour}
      />
      <WhatsNewModal
        open={whatsNewOpen}
        content={content}
        onClose={() => setWhatsNewOpen(false)}
        onDismiss={dismissWhatsNew}
      />
    </div>
  );
}
