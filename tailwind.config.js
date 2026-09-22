/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        cream: {
          50:  '#fdfcf8',
          100: '#faf7ef',
          200: '#f4ede0',
          300: '#ecddd0',
          400: '#d8c4b0',
          500: '#c4aa90',
        },
        ink: {
          50:  '#f6f4f1',
          100: '#e8e4de',
          200: '#d0c9bf',
          300: '#b0a898',
          400: '#8a7f70',
          500: '#6b6055',
          600: '#524940',
          700: '#3d3530',
          800: '#2b2520',
          900: '#1c1915',
          950: '#100e0b',
        },
        gold: {
          300: '#f0d080',
          400: '#e8bc50',
          500: '#d4a017',
          600: '#b8860b',
          700: '#9a6f08',
        },
      },
      boxShadow: {
        'luxury': '0 1px 3px rgba(16,14,11,0.06), 0 4px 16px rgba(16,14,11,0.08)',
        'luxury-md': '0 2px 8px rgba(16,14,11,0.08), 0 8px 32px rgba(16,14,11,0.10)',
        'luxury-lg': '0 4px 16px rgba(16,14,11,0.10), 0 24px 64px rgba(16,14,11,0.14)',
        'inner-sm': 'inset 0 1px 2px rgba(16,14,11,0.06)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease forwards',
        'slide-in': 'slideIn 0.3s ease forwards',
      },
    },
  },
  plugins: [],
};
