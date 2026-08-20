/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gemini: {
          blue: '#2563eb',
          'blue-dark': '#3b82f6',
          indigo: '#4f46e5',
          violet: '#7c3aed',
          cyan: '#06b6d4',
          page: {
            light: '#f8fafc',
            dark: '#0f172a',
          },
          card: {
            light: '#ffffff',
            dark: '#1e293b',
          },
          border: {
            light: '#e2e8f0',
            dark: '#334155',
          },
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
