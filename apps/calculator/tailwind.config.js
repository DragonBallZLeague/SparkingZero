/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sz-orange': '#f97316',
        'sz-dark': '#0f0f0f',
        'sz-panel': '#1a1a1a',
        'sz-border': '#2a2a2a',
        'sz-accent': '#ff6b00',
      },
    },
  },
  plugins: [],
};
