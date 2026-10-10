import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff4ef',
          100: '#ffe4d6',
          200: '#ffc5a8',
          300: '#ff9d70',
          400: '#ff7a45',
          500: '#ff5a1f',
          600: '#ec4310',
          700: '#c4320e',
          800: '#9c2a13',
          900: '#7e2613',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae2',
          300: '#b0b9c8',
          400: '#8592a8',
          500: '#66748d',
          600: '#515d74',
          700: '#424c5f',
          800: '#2b3240',
          900: '#161b26',
          950: '#0c0f16',
        },
      },
      fontFamily: {
        sans: ['Heebo', 'Assistant', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)',
      },
    },
  },
  plugins: [],
};
export default config;
