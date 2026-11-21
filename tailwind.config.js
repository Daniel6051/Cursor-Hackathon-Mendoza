/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#0E2A3B', water: '#2BB3C0', mist: '#F4F8F7' },
      fontFamily: {
        sans: ['Outfit', 'Segoe UI', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
