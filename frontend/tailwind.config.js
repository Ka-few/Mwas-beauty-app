/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          50: '#f5f0fb',
          100: '#e6dff7',
          200: '#d1baf0',
          300: '#b894e8',
          400: '#a06de0',
          500: '#8736d6', // main purple
          600: '#6e27ad',
          700: '#541e83',
          800: '#3a1459',
          900: '#21082f'
        },
        gold: {
          50: '#fff9f0',
          100: '#fff2d9',
          200: '#ffe5b3',
          300: '#ffd78c',
          400: '#ffc960',
          500: '#ffb900', // main gold
          600: '#e6a500',
          700: '#b37f00',
          800: '#805900',
          900: '#4d3300'
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
