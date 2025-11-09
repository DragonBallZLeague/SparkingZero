/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dragon-orange': '#f59e0b',
        'dragon-red': '#dc2626',
        'dragon-purple': '#7c3aed',
        green: {
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        teal: {
          400: '#2dd4bf',
          600: '#0d9488',
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(255, 165, 0, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(255, 165, 0, 0.6)',
          },
        },
      },
    },
  },
  plugins: [],
}

