import { useState, useEffect } from 'react';

export default function IOSInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('installBannerDismissed');

    if (isIOS && !isStandalone && !dismissed) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem('installBannerDismissed', 'true');
    setShow(false);
  };

  return (
    <div className="install-banner">
      <span className="install-banner__text">
        Install Colony Counter: tap <strong>Share</strong> →{' '}
        <strong>Add to Home Screen</strong>
      </span>
      <button
        type="button"
        className="install-banner__close"
        onClick={dismiss}
        aria-label="Dismiss install banner"
      >
        ✕
      </button>
    </div>
  );
}
