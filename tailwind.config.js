/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primera: {
          navy: '#172E49',
          gold: '#C5A15B',
          ivory: '#F4F1E9',
          teal: '#4C8290',
        },
        genre: {
          blue: '#005BAC',
          'blue-dark': '#003D73',
          'blue-light': '#EBF4FC',
          orange: '#FF8200',
          'orange-dark': '#CC6800',
          'orange-light': '#FFF5EB',
          teal: '#00A896',
          purple: '#6C5CE7',
        },
      },
    },
  },
  plugins: [],
};

export default config;
