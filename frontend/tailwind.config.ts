import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary radiology dark backgrounds
        rad: {
          // Backgrounds
          bg: '#0a0a0f',
          surface: '#111118',
          panel: '#16161f',
          card: '#1c1c28',
          border: '#2a2a3a',
          'border-light': '#3a3a4f',

          // Cyan accent (primary action color)
          cyan: {
            50: '#ecfeff',
            100: '#cffafe',
            200: '#a5f3fc',
            300: '#67e8f9',
            400: '#22d3ee',
            500: '#06b6d4',
            600: '#0891b2',
            700: '#0e7490',
            800: '#155e75',
            900: '#164e63',
            950: '#083344',
          },

          // Status colors
          success: '#10b981',
          'success-dim': '#064e3b',
          warning: '#f59e0b',
          'warning-dim': '#451a03',
          error: '#ef4444',
          'error-dim': '#450a0a',
          info: '#3b82f6',
          'info-dim': '#1e3a5f',

          // Text hierarchy
          'text-primary': '#f1f5f9',
          'text-secondary': '#94a3b8',
          'text-muted': '#64748b',
          'text-disabled': '#334155',

          // Modality badge colors
          ct: '#06b6d4',
          mri: '#8b5cf6',
          xr: '#10b981',
          us: '#f59e0b',
          nm: '#ec4899',
          pt: '#f97316',
          mg: '#14b8a6',
          dx: '#6366f1',

          // Viewer-specific
          'viewer-bg': '#000000',
          'viewer-overlay': 'rgba(0,0,0,0.7)',
          'viewer-crosshair': '#ffff00',
          'viewer-measurement': '#00ff00',
          'viewer-annotation': '#ff6b6b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'rad-sm': '0 1px 3px rgba(0,0,0,0.6)',
        'rad-md': '0 4px 12px rgba(0,0,0,0.5)',
        'rad-lg': '0 8px 24px rgba(0,0,0,0.6)',
        'rad-xl': '0 16px 40px rgba(0,0,0,0.7)',
        'rad-glow': '0 0 20px rgba(6,182,212,0.3)',
        'rad-glow-sm': '0 0 8px rgba(6,182,212,0.2)',
      },
      backgroundImage: {
        'rad-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #111118 50%, #16161f 100%)',
        'rad-card-gradient': 'linear-gradient(135deg, #1c1c28 0%, #16161f 100%)',
        'rad-cyan-gradient': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        'rad-header-gradient': 'linear-gradient(90deg, #0a0a0f 0%, #111118 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
