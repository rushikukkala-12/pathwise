/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#EEF0FF', 100: '#E0E4FF', 200: '#C4CAFF', 300: '#9AA3F7', 400: '#707AE8', 500: '#4C54D0', 600: '#3B41B2', 700: '#2E3392', 800: '#242872', 900: '#1B1E54', 950: '#11133A' },
        sea: { 50: '#E8FAF7', 100: '#C9F3EC', 200: '#94E6DB', 300: '#58D2C4', 400: '#27B9A9', 500: '#129D8F', 600: '#0C7E74', 700: '#0B655E', 800: '#0A4F4A', 900: '#083F3C' },
        sun: { 50: '#FFF4E9', 100: '#FFE6CE', 200: '#FFCA9B', 300: '#FFAA61', 400: '#FA8B30', 500: '#EE7511', 600: '#C95C09', 700: '#A04609' },
        canvas: '#F5F6FB',
        ink: '#141832',
        muted: '#596080',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'Figtree', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,24,50,.04), 0 4px 16px -6px rgba(20,24,50,.08)',
        pop: '0 12px 40px -12px rgba(27,30,84,.35)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        rise: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        pop: { from: { opacity: 0, transform: 'scale(.97)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: { rise: 'rise .25s ease-out', pop: 'pop .18s ease-out' },
    },
  },
  plugins: [],
};
