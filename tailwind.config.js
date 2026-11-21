/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#0E2A3B', water: '#2BB3C0', mist: '#F4F8F7' },
      fontFamily: {
        sans: ['Manrope Variable', 'Segoe UI', 'sans-serif'],
        display: ['Manrope Variable', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
