import { useEffect, useRef, useState } from 'react';

/**
 * Silent looping demo — supports local MP4 or CSS workflow steps fallback.
 * @param {{ type?: string, src?: string, poster?: string, steps?: string[], alt?: string }} demo
 */
export default function DemoAnimation({ demo }) {
  const videoRef = useRef(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = demo?.steps ?? [];
  const isWorkflow = demo?.type === 'workflow' || (!demo?.src && steps.length > 0);
  const showVideo = demo?.type === 'video' || (demo?.src && !isWorkflow);

  useEffect(() => {
    if (!isWorkflow || steps.length < 2) return undefined;
    const timer = setInterval(() => {
      setActiveStep((i) => (i + 1) % steps.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [isWorkflow, steps.length]);

  useEffect(() => {
    setVideoFailed(false);
  }, [demo?.src]);

  if (showVideo && demo?.src && !videoFailed) {
    return (
      <div className="onboarding-demo onboarding-demo--video">
        <video
          ref={videoRef}
          className="onboarding-demo__video"
          src={demo.src}
          poster={demo.poster || undefined}
          loop
          muted
          playsInline
          autoPlay
          onError={() => setVideoFailed(true)}
          aria-label={demo.alt || 'Workflow demonstration'}
        />
      </div>
    );
  }

  if (steps.length > 0) {
    return (
      <div className="onboarding-demo onboarding-demo--workflow" aria-hidden="true">
        <div className="onboarding-demo__workflow-track">
          {steps.map((label, index) => (
            <div
              key={label}
              className={`onboarding-demo__workflow-step${
                index === activeStep ? ' onboarding-demo__workflow-step--active' : ''
              }${index < activeStep ? ' onboarding-demo__workflow-step--done' : ''}`}
            >
              <span className="onboarding-demo__workflow-num">{index + 1}</span>
              <span className="onboarding-demo__workflow-label">{label}</span>
            </div>
          ))}
        </div>
        <div className="onboarding-demo__workflow-bar">
          <div
            className="onboarding-demo__workflow-progress"
            style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-demo onboarding-demo--placeholder">
      <span className="onboarding-demo__placeholder-text">Workflow preview</span>
    </div>
  );
}
