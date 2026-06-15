import { NAV_ITEMS } from '../constants/theme';

export default function Sidebar({
  activeTab,
  onTabChange,
  standardCurveAvailable,
  timeCourseAvailable,
}) {
  return (
    <nav className="qi-sidebar" aria-label="qPCR Analysis sections">
      <div className="qi-sidebar__brand">
        <span className="qi-sidebar__brand-mark" aria-hidden>
          ◈
        </span>
        <span className="qi-sidebar__brand-name">qPCR Analysis</span>
      </div>
      <ul className="qi-sidebar__nav">
        {NAV_ITEMS.map(({ id, label, icon }) => {
          const isStandardCurve = id === 'standard-curve';
          const isTimeCourse = id === 'time-course';
          const disabled =
            (isStandardCurve && !standardCurveAvailable) ||
            (isTimeCourse && !timeCourseAvailable);

          let disabledTitle;
          if (isStandardCurve && disabled) {
            disabledTitle = "No dilution series detected in sample names (e.g. '1:10', '1:100').";
          } else if (isTimeCourse && disabled) {
            disabledTitle =
              "Select a reference gene in the ΔΔCt tab first, and make sure sample names include a time point prefix (e.g. '0 1:100', '24 1:100').";
          }

          return (
            <li key={id}>
              <button
                type="button"
                className={[
                  'qi-sidebar__item',
                  activeTab === id ? 'qi-sidebar__item--active' : '',
                  disabled ? 'qi-sidebar__item--disabled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => !disabled && onTabChange(id)}
                disabled={disabled}
                title={disabledTitle}
              >
                <span className="qi-sidebar__icon" aria-hidden>
                  {icon}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
