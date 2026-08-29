/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        accent: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
        },
        surface: {
          light: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          dark: '#0F172A',
          darkCard: '#1E293B',
          darkBorder: '#334155',
        }
      },
      boxShadow: {
        'soft-sm': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        'soft-md': '0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03)',
        'soft-lg': '0 10px 25px -3px rgba(0,0,0,0.06), 0 4px 6px -2px rgba(0,0,0,0.03)',
        'glow-brand': '0 0 20px -3px rgba(99, 102, 241, 0.35)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
