/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rafiq-bg': '#0a0f1a',
        'rafiq-glow': '#00d4ff',
        'rafiq-glow-dim': '#0066cc',
        'rafiq-accent': '#00ffcc',
        'rafiq-warning': '#ff9500',
        'rafiq-danger': '#ff3b5c',
        'rafiq-text': '#e0f7ff',
        'rafiq-text-dim': '#6b8fa3'
      },
      animation: {
        'breathe': 'breathe 4s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'spin-reverse': 'spin 6s linear infinite reverse',
        'wave': 'wave 0.8s ease-in-out infinite'
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' }
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' },
          '50%': { boxShadow: '0 0 60px rgba(0, 212, 255, 0.8)' }
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(1.5)' }
        }
      },
      boxShadow: {
        'glow': '0 0 30px rgba(0, 212, 255, 0.5)',
        'glow-lg': '0 0 60px rgba(0, 212, 255, 0.7)',
        'inner-glow': 'inset 0 0 30px rgba(0, 212, 255, 0.3)'
      }
    }
  },
  plugins: []
};