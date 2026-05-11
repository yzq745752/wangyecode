/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00ff9d',
        'primary-dim': '#00cc7d',
        'primary-glow': 'rgba(0, 255, 157, 0.3)',
        secondary: '#b19cd9',
        accent: '#ff6b9d',
        'bg-dark': '#0a0a0f',
        'bg-card': '#12121a',
        'bg-hover': '#1a1a2e',
        'bg-elevated': '#16161f',
        'text-primary': '#e4e4e7',
        'text-secondary': '#71717a',
        'text-dim': '#3f3f46',
        'border-subtle': '#27272a',
        'border-glow': 'rgba(0, 255, 157, 0.15)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-down': 'slide-down 0.2s ease-out',
        'scanline': 'scanline 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'typing': 'typing 2s steps(20) infinite',
        'border-flow': 'border-flow 3s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 255, 157, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 255, 157, 0.4)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.95' },
        },
        'typing': {
          '0%': { width: '0' },
          '50%': { width: '100%' },
          '100%': { width: '0' },
        },
        'border-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 255, 157, 0.15)',
        'glow-lg': '0 0 40px rgba(0, 255, 157, 0.2)',
        'glow-secondary': '0 0 20px rgba(177, 156, 217, 0.15)',
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(177, 156, 217, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(177, 156, 217, 0.03) 1px, transparent 1px)",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
