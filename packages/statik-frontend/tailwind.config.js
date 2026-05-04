/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens — values come from CSS variables in index.css.
        // Light mode is the default; .dark on <html> swaps to dark values.
        surface: 'var(--surface)',
        background: 'var(--background)',
        'surface-dim': 'var(--surface-dim)',
        'surface-bright': 'var(--surface-bright)',
        'surface-container-lowest': 'var(--surface-container-lowest)',
        'surface-container-low': 'var(--surface-container-low)',
        'surface-container': 'var(--surface-container)',
        'surface-container-high': 'var(--surface-container-high)',
        'surface-container-highest': 'var(--surface-container-highest)',
        'on-surface': 'var(--on-surface)',
        'on-background': 'var(--on-background)',
        'on-surface-variant': 'var(--on-surface-variant)',
        outline: 'var(--outline)',
        'outline-variant': 'var(--outline-variant)',
        primary: 'var(--primary)',
        'on-primary': 'var(--on-primary)',
        'primary-fixed-dim': 'var(--primary-fixed-dim)',
        // Status colors — identical in both themes
        'status-pass': '#16A34A',
        'status-fail': '#DC2626',
        'status-warn': '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        'mono-label': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '500' }],
        h2: ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'data-point': ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        h1: ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
      spacing: {
        'stack-xs': '4px',
        'stack-sm': '8px',
        'stack-md': '16px',
        'stack-lg': '24px',
        gutter: '24px',
        'margin-page': '40px',
      },
      maxWidth: {
        'container-max': '1440px',
      },
    },
  },
  plugins: [],
};
