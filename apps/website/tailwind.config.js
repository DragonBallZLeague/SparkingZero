import tokens from '../../packages/ui/src/tokens.js';

const { brand, surface, font } = tokens;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    './cms/**/*.{js,jsx}',
    '../../packages/ui/src/**/*.{js,jsx}',
  ],
  darkMode: 'class',
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
        // Existing site palette, now sourced from the shared tokens so the
        // orange cannot drift from the other apps. Names are unchanged, so all
        // existing `bg-dbz-orange` style markup keeps working.
        dbz: {
          orange: brand.orange,
          blue: brand.blue,
          red: brand.red,
          yellow: brand.yellow,
          dark: surface.dark,
          darker: surface.darkest,
        },
      },
      fontFamily: {
        heading: font.heading,
        body: font.body,
      },
    },
  },
  plugins: [],
};
