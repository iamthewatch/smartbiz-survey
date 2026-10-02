/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // SmartBiz Design Code v1: Condensed Bold + Grotesk + Elegant Serif
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Oswald', 'Inter', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      colors: {
        // база: графит / молочный / серый / хром
        graphite: { DEFAULT: '#111111', 800: '#1c1c1c', 700: '#2a2a2a' },
        milk: '#F5F3EE',
        paper: '#FBFAF7',
        soft: '#D9D9D6',
        chrome: '#BFC3C8',
        // акцент — только для CTA и активных элементов (5–10% композиции)
        rust: {
          50: '#fbf3ee',
          100: '#f6e2d6',
          200: '#ecc2a9',
          300: '#e09c74',
          400: '#d47746',
          500: '#C65A1E',
          600: '#a94a17',
          700: '#8a3c14',
          800: '#6d3013',
          900: '#572812',
          950: '#2f1308',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(198,90,30,.35), 0 10px 30px -12px rgba(198,90,30,.45)',
        card: '0 1px 2px rgba(17,17,17,.04), 0 12px 32px -18px rgba(17,17,17,.18)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}
