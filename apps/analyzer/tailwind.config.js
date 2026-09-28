const { brand, surface, font } = require('../../packages/ui/src/tokens.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    // Shared components live outside this app; their classes must be scanned too.
    '../../packages/ui/src/**/*.{js,jsx}',
  ],
  corePlugins: {
    // Preflight is OFF until Phase 2b retires App.css. See src/index.css - this
    // app's 6,600-line component tree was never written against Tailwind's base
    // reset, and enabling it would restyle headings, margins and borders
    // wholesale. Consequence: border-width utilities need an explicit
    // border-style until preflight is on.
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // Shared palette. Prefer these names in new work.
        brand: {
          DEFAULT: brand.orange,
          orange: brand.orange,
          'orange-deep': brand.orangeDeep,
          red: brand.red,
          purple: brand.purple,
          amber: brand.amber,
        },
        surface,
        // Legacy analyzer names, kept so nothing has to change at once.
        // 'dragon-orange' was #f59e0b; it now resolves to the canonical league
        // orange. Nothing in src/ referenced it while Tailwind was inert, so
        // this retune is not a visual change today.
        'dragon-orange': brand.orange,
        'dragon-red': brand.red,
        'dragon-purple': brand.purple,
      },
      fontFamily: {
        heading: font.heading,
        body: font.body,
      },

      // THE APP'S CURRENT LOOK, as Tailwind theme values.
      //
      // App.css ends with a "modern redesign layer" that re-skinned the app by
      // redefining Tailwind's own class names: rounder corners, softer shadows,
      // a navy card surface, faint hairline borders, a fluid page width. Since
      // App.css moved into the `legacy` cascade layer (2026-09-28), Tailwind wins
      // over it, so those values live here instead - otherwise making Tailwind
      // authoritative would have silently reverted the whole app to stock
      // Tailwind. The redesign restyles from here: change a value in this block
      // and it changes everywhere, with no App.css rule to fight.
      borderRadius: {
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        lg: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 24px -12px rgba(15, 23, 42, 0.14)',
        xl: '0 1px 2px rgba(15, 23, 42, 0.04), 0 16px 32px -14px rgba(15, 23, 42, 0.16)',
        '2xl': '0 2px 4px rgba(15, 23, 42, 0.05), 0 24px 48px -16px rgba(15, 23, 42, 0.20)',
      },
      // Surfaces only: text-gray-700/800 keep Tailwind's greys, as they did.
      // App.css tinted gray-800 navy on cards alone (.bg-gray-800.rounded-xl);
      // it is one value here, a shift of a few RGB units on the other gray-800s.
      backgroundColor: {
        gray: { 700: '#2b3245', 800: '#1e2434' },
      },
      // A faint slate hairline, as App.css drew it. The alpha is scaled, not
      // replaced, so an opacity modifier still means "fainter":
      // border-gray-700 = 18%, border-gray-700/60 = 60% of that.
      borderColor: {
        gray: { 700: 'rgb(148 163 184 / calc(<alpha-value> * 0.18))' },
      },
      fontSize: {
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.015em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
      },
      maxWidth: {
        // The page shell: fluid up to 1760px instead of a fixed 1280px.
        '7xl': 'min(1760px, 97vw)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(249, 115, 22, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
