import pkg from '../../package.json';

/** Application version, sourced from package.json (stamped into saved projects). */
export const APP_VERSION = pkg.version ?? '0.0.0';
