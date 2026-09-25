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
