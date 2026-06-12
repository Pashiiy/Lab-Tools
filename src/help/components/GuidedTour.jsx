import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function getTargetRect(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

function computeTooltipStyle(rect, placement = 'bottom') {
  const pad = 12;
  const cardW = 320;
  const cardH = 140;
  let top = rect.bottom + pad;
  let left = rect.left + rect.width / 2 - cardW / 2;

  if (placement === 'top') {
    top = rect.top - cardH - pad;
  }

  left = Math.max(12, Math.min(left, window.innerWidth - cardW - 12));
  top = Math.max(12, Math.min(top, window.innerHeight - cardH - 12));

  return { top, left, width: cardW };
}

export default function GuidedTour({ open, steps = [], onClose, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const step = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;

  const refreshTarget = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    requestAnimationFrame(() => {
      setTargetRect(getTargetRect(step.target));
    });
  }, [step]);

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setTargetRect(null);
      return undefined;
    }
    refreshTarget();
    const onResize = () => refreshTarget();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, stepIndex, refreshTarget]);

  if (!open || !step) return null;

  const padding = 6;
  const spotlight = targetRect
    ? {
        top: targetRect.top - padding,
        left: targetRect.left - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      }
    : null;

  const tooltipStyle = targetRect
    ? computeTooltipStyle(targetRect, step.placement)
    : { top: '50%', left: '50%', width: 320, transform: 'translate(-50%, -50%)' };

  const finish = () => {
    onComplete?.();
    onClose?.();
    setStepIndex(0);
  };

  const goNext = () => {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  };

  return createPortal(
    <div className="onboarding-tour" role="dialog" aria-modal="true" aria-label="Guided tour">
      <div className="onboarding-tour__overlay" />

      {spotlight && (
        <div
          className="onboarding-tour__spotlight"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      <div
        className="onboarding-tour__card"
        style={
          targetRect
            ? { top: tooltipStyle.top, left: tooltipStyle.left, width: tooltipStyle.width }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 320 }
        }
      >
        <div className="onboarding-tour__step-meta">
          Step {stepIndex + 1} of {steps.length}
        </div>
        <h3 className="onboarding-tour__title">{step.title}</h3>
        <p className="onboarding-tour__body">{step.body}</p>
        <div className="onboarding-tour__actions">
          <button type="button" className="onboarding-btn onboarding-btn--ghost" onClick={finish}>
            Skip tour
          </button>
          <div className="onboarding-modal__footer-spacer" />
          {stepIndex > 0 && (
            <button
              type="button"
              className="onboarding-btn onboarding-btn--secondary"
              onClick={() => setStepIndex((i) => i - 1)}
            >
              Back
            </button>
          )}
          <button type="button" className="onboarding-btn onboarding-btn--primary" onClick={goNext}>
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
