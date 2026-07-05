/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Exact palette derived from the logo: black background, neon-orange glow
        void: {
          DEFAULT: '#050403',
          50: '#0d0b09',
          100: '#0a0806',
          950: '#000000',
        },
        surface: {
          DEFAULT: '#121009',
          light: '#1c1811',
          border: '#2b2214',
        },
        ember: {
          50: '#fff4e0',
          100: '#ffe4b3',
          200: '#ffd280',
          300: '#ffbe4d',
          400: '#ffa726',
          500: '#ff9500', // logo core orange
          600: '#f27d00',
          700: '#d96600',
          800: '#a84f00',
          900: '#7a3900',
        },
        glow: '#ffb347',
      },
      fontFamily: {
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 8px rgba(255,149,0,0.55), 0 0 24px rgba(255,149,0,0.25)',
        'neon-lg': '0 0 16px rgba(255,149,0,0.6), 0 0 48px rgba(255,149,0,0.3)',
        'neon-inset': 'inset 0 0 0 1px rgba(255,149,0,0.4)',
      },
      backgroundImage: {
        'radial-fade': 'radial-gradient(circle at 50% 0%, rgba(255,149,0,0.12), transparent 60%)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.55 },
        },
        floatIn: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 2.4s ease-in-out infinite',
        floatIn: 'floatIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
