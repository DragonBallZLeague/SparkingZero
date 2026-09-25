/**
 * Shared design tokens for every app in the monorepo.
 *
 * Before this existed, each app invented its own name for the same colour:
 * the website used `dbz.orange` (#f97316), the calculator `sz-orange` (#f97316),
 * the analyzer `dragon-orange` (#f59e0b - a genuinely different, amber hue), and
 * match builder had no palette at all. #f97316 is canonical: it was already the
 * public-facing website's accent and the calculator's, so it wins on incumbency.
 *
 * CommonJS on purpose. Each app's tailwind.config.js consumes this directly, and
 * those configs are a mix of CJS (analyzer, match builder) and ESM (website,
 * calculator) - `module.exports` is the form both can load. There is no build
 * step in packages/ui; consumers alias `@szl/ui` straight at source.
 *
 * Apps keep their existing token NAMES as aliases onto these values, so no
 * existing markup breaks. New work should prefer the shared `brand.*` names.
 */

const brand = {
  /** Primary accent. The league orange. */
  orange: '#f97316',
  /** Darker orange for hover/pressed states. */
  orangeDeep: '#ea580c',
  /** Secondary accent, used in gradients and "danger"-adjacent emphasis. */
  red: '#dc2626',
  /** Tertiary accent, used in gradients and for meta/analysis surfaces. */
  purple: '#7c3aed',
  /** Kept for the analyzer's legacy amber gradient stop. Not an accent. */
  amber: '#f59e0b',
  blue: '#3b82f6',
  yellow: '#eab308',
};

/** Neutral surfaces, darkest first. Dark mode is the default across the apps. */
const surface = {
  darkest: '#020617',
  darker: '#0f0f0f',
  dark: '#0f172a',
  panel: '#1a1a1a',
  border: '#2a2a2a',
};

const radius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
};

const font = {
  heading: ['"Segoe UI"', 'Roboto', 'sans-serif'],
  body: ['Inter', '"Segoe UI"', 'Roboto', 'sans-serif'],
};

module.exports = { brand, surface, radius, font };
