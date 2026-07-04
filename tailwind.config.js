/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Site accent remapped from purple to a dark forest green.
        // Anchored on #072e07 (the deep primary/hover); lighter steps keep
        // dark-mode text and hover states legible. Overriding `purple` here
        // means every existing `purple-*` utility renders green.
        purple: {
          50: '#eef7ee',
          100: '#d6ecd6',
          200: '#aed9ae',
          300: '#78bd78',
          400: '#4aa24a',
          500: '#2b7d2f',
          600: '#0f4f12',
          700: '#072e07',
          800: '#052205',
          900: '#031703',
          950: '#010c01',
        },
        // Neutral remapped from Tailwind slate to a desaturated blue: same blue
        // hue and lightness at every step, saturation cut ~55%, so the dark
        // background reads as a soft dusty blue instead of a saturated navy.
        slate: {
          50: '#f9fafb',
          100: '#f3f5f7',
          200: '#e6e9ec',
          300: '#d1d6db',
          400: '#9ea5ae',
          500: '#6f7680',
          600: '#505760',
          700: '#3c434c',
          800: '#262b33',
          900: '#161a23',
          950: '#080a11',
        },
      },
    },
  },
  plugins: [],
}

