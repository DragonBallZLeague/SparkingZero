import tokens from '../../packages/ui/src/tokens.js';

const { brand, surface, font } = tokens;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Shared palette (packages/ui/src/tokens.js). Prefer these in new work.
        brand: {
          DEFAULT: brand.orange,
          orange: brand.orange,
          'orange-deep': brand.orangeDeep,
          red: brand.red,
          purple: brand.purple,
        },
        surface,
        // Existing calculator palette, now sourced from the shared tokens.
        // Names unchanged, so existing `bg-sz-panel` style markup keeps working.
        'sz-orange': brand.orange,
        'sz-dark': surface.darker,
        'sz-panel': surface.panel,
        'sz-border': surface.border,
        // Kept as-is: a distinct, more saturated accent this app uses
        // deliberately, not a drifted copy of the league orange.
        'sz-accent': '#ff6b00',
      },
      fontFamily: {
        heading: font.heading,
        body: font.body,
      },
    },
  },
  plugins: [],
};
