import { useState } from 'react';
import DemoAnimation from './DemoAnimation';

const INTRO_SLIDES = ['welcome', 'purpose', 'capabilities', 'demo', 'start'];

export default function IntroModal({
  open,
  content,
  onClose,
  onStartTour,
  onComplete,
}) {
  const [slideIndex, setSlideIndex] = useState(0);

  if (!open || !content) return null;

  const slide = INTRO_SLIDES[slideIndex];
  const isLast = slideIndex === INTRO_SLIDES.length - 1;

  const goNext = () => {
    if (isLast) {
      onComplete?.();
      onClose?.();
      setSlideIndex(0);
      return;
    }
    setSlideIndex((i) => i + 1);
  };

  const goBack = () => setSlideIndex((i) => Math.max(0, i - 1));

  const handleSkip = () => {
    onComplete?.();
    onClose?.();
    setSlideIndex(0);
  };

  return (
    <div className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-intro-title">
      <div className="onboarding-modal__backdrop" onClick={handleSkip} aria-hidden="true" />
      <div className="onboarding-modal__card onboarding-modal__card--intro">
        <header className="onboarding-modal__header">
          <div className="onboarding-modal__progress" aria-hidden="true">
            {INTRO_SLIDES.map((_, i) => (
              <span
                key={INTRO_SLIDES[i]}
                className={`onboarding-modal__dot${i === slideIndex ? ' onboarding-modal__dot--active' : ''}${
                  i < slideIndex ? ' onboarding-modal__dot--done' : ''
                }`}
              />
            ))}
          </div>
          <button type="button" className="onboarding-modal__skip" onClick={handleSkip}>
            Skip
          </button>
        </header>

        <div className="onboarding-modal__body">
          {slide === 'welcome' && (
            <>
              <p className="onboarding-modal__eyebrow">Welcome to</p>
              <h2 id="onboarding-intro-title" className="onboarding-modal__title">
                {content.title}
              </h2>
              {content.learningTime && (
                <p className="onboarding-modal__meta">{content.learningTime}</p>
              )}
            </>
          )}

          {slide === 'purpose' && (
            <>
              <h2 className="onboarding-modal__title">Purpose</h2>
              <p className="onboarding-modal__text">{content.purpose}</p>
            </>
          )}

          {slide === 'capabilities' && (
            <>
              <h2 className="onboarding-modal__title">Main capabilities</h2>
              <ul className="onboarding-modal__capabilities">
                {content.capabilities?.map((item) => (
                  <li key={item}>
                    <span className="onboarding-modal__check" aria-hidden="true">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}

          {slide === 'demo' && (
            <>
              <h2 className="onboarding-modal__title">Workflow overview</h2>
              <DemoAnimation demo={content.demo} />
            </>
          )}

          {slide === 'start' && (
            <>
              <h2 className="onboarding-modal__title">Ready to begin</h2>
              <p className="onboarding-modal__text">
                Use the <strong>?</strong> help button anytime for documentation, tips, and FAQ.
                You can replay this introduction from the Help panel.
              </p>
            </>
          )}
        </div>

        <footer className="onboarding-modal__footer">
          {slideIndex > 0 && (
            <button type="button" className="onboarding-btn onboarding-btn--ghost" onClick={goBack}>
              Back
            </button>
          )}
          <div className="onboarding-modal__footer-spacer" />
          {isLast ? (
            <>
              <button
                type="button"
                className="onboarding-btn onboarding-btn--secondary"
                onClick={() => {
                  onComplete?.();
                  onClose?.();
                  setSlideIndex(0);
                  onStartTour?.();
                }}
              >
                Take Guided Tour
              </button>
              <button type="button" className="onboarding-btn onboarding-btn--primary" onClick={goNext}>
                Start Using Tool
              </button>
            </>
          ) : (
            <button type="button" className="onboarding-btn onboarding-btn--primary" onClick={goNext}>
              Continue
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
