/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ⚠️ CHANGED: these used to be hardcoded hex values. They're now
        // CSS variables (set in index.css per data-theme) so the whole app
        // can re-skin at runtime (Ember/Blue/Green/Purple/AMOLED) without a
        // rebuild - every existing bg-ember-500 / text-ember-400 / etc class
        // still works exactly the same, it just resolves a variable now.
        void: {
          DEFAULT: 'rgb(var(--void) / <alpha-value>)',
          50: 'rgb(var(--void-50) / <alpha-value>)',
          100: 'rgb(var(--void-100) / <alpha-value>)',
          950: 'rgb(var(--void-950) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          light: 'rgb(var(--surface-light) / <alpha-value>)',
          border: 'rgb(var(--surface-border) / <alpha-value>)',
        },
        ember: {
          50: 'rgb(var(--ember-50) / <alpha-value>)',
          100: 'rgb(var(--ember-100) / <alpha-value>)',
          200: 'rgb(var(--ember-200) / <alpha-value>)',
          300: 'rgb(var(--ember-300) / <alpha-value>)',
          400: 'rgb(var(--ember-400) / <alpha-value>)',
          500: 'rgb(var(--ember-500) / <alpha-value>)',
          600: 'rgb(var(--ember-600) / <alpha-value>)',
          700: 'rgb(var(--ember-700) / <alpha-value>)',
          800: 'rgb(var(--ember-800) / <alpha-value>)',
          900: 'rgb(var(--ember-900) / <alpha-value>)',
        },
        glow: 'rgb(var(--glow) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 8px rgb(var(--ember-500) / 0.55), 0 0 24px rgb(var(--ember-500) / 0.25)',
        'neon-lg': '0 0 16px rgb(var(--ember-500) / 0.6), 0 0 48px rgb(var(--ember-500) / 0.3)',
        'neon-inset': 'inset 0 0 0 1px rgb(var(--ember-500) / 0.4)',
      },
      backgroundImage: {
        'radial-fade': 'radial-gradient(circle at 50% 0%, rgb(var(--ember-500) / 0.12), transparent 60%)',
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
