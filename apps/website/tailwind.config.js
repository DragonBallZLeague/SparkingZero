/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dbz: {
          orange: '#F97316',
          blue: '#3B82F6',
          red: '#DC2626',
          yellow: '#EAB308',
          dark: '#0F172A',
          darker: '#020617',
        },
      },
      fontFamily: {
        heading: ['"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
