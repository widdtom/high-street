/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // System stack only — no fonts are ever fetched over the network.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        copper: '#b87333',
        silver: '#c0c4c8',
        goldcoin: '#d4af37',
        street: '#f4ead8',
      },
    },
  },
  plugins: [],
};
