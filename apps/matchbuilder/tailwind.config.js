const defaultColors = require('tailwindcss/colors');
const { brand, surface, font } = require('../../packages/ui/src/tokens.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx}',
  ],
  // This app builds some class names dynamically, so Tailwind's scanner cannot
  // see them in source. Do not remove entries without confirming the class is
  // no longer assembled at runtime.
  safelist: [
    'from-orange-600', 'to-orange-700', 'from-orange-300', 'from-orange-400', 'via-orange-400',
    'text-orange-300', 'text-orange-400', 'text-orange-600', 'border-orange-400', 'border-orange-500',
    'from-green-600', 'to-green-700', 'text-green-600', 'text-green-700', 'border-green-500', 'bg-green-600', 'bg-green-700',
    'from-red-600', 'to-red-700', 'text-red-600', 'text-red-700', 'border-red-500', 'bg-red-600', 'bg-red-700',
    'from-slate-700', 'via-slate-600', 'to-slate-700', 'from-slate-800', 'to-slate-700', 'bg-slate-700', 'bg-slate-800', 'text-slate-700', 'text-slate-800',
    'bg-gradient-to-br', 'bg-gradient-to-r', 'bg-clip-text', 'bg-transparent', 'text-transparent',
    'shadow-xl', 'shadow-2xl', 'shadow-lg', 'shadow-md', 'hover:shadow-xl', 'hover:shadow-lg',
    'border-2', 'border',
    'rounded-xl', 'rounded-2xl', 'font-bold', 'font-black', 'drop-shadow', 'drop-shadow-lg', 'tracking-tight', 'tracking-wider', 'tracking-widest',
    'hover:scale-105', 'hover:scale-110', 'transition-all', 'duration-300'
  ],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      colors: {
        // Re-exporting the default palette into `extend` is pre-existing and
        // mostly a no-op; kept so nothing that relies on it changes.
        ...defaultColors,
        // Shared palette (packages/ui/src/tokens.js). This app previously had no
        // brand colours of its own and reached for raw `orange-600` etc.
        brand: {
          DEFAULT: brand.orange,
          orange: brand.orange,
          'orange-deep': brand.orangeDeep,
          red: brand.red,
          purple: brand.purple,
        },
        surface,
      },
      fontFamily: {
        heading: font.heading,
        body: font.body,
      },
    },
  },
  plugins: [],
};
