const config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        canvas: '#f5f7f6',
        ink: '#102a27',
        muted: '#5b6b68',
        signal: {
          ok: '#0d9488',
          low: '#b45309',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(16, 42, 39, 0.04), 0 12px 32px rgba(16, 42, 39, 0.04)',
      },
    },
  },
}

export default config
