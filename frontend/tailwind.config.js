/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0d1117',
        'surface': '#111820',
        'surface-2': '#161e28',
        'surface-3': '#1c2635',
        'border': 'rgba(255,255,255,0.07)',
        'border-strong': 'rgba(255,255,255,0.12)',
        teal: {
          DEFAULT: '#2dd4bf',
          dim: 'rgba(45,212,191,0.15)',
          glow: 'rgba(45,212,191,0.25)',
        },
        amber: {
          warm: '#f59e0b',
          'warm-dim': 'rgba(245,158,11,0.15)',
        },
        fg: '#f0f6fc',
        muted: '#7d8590',
        'muted-2': '#3d444d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'mesh': 'radial-gradient(ellipse 80% 50% at 85% 0%, rgba(45,212,191,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(245,158,11,0.08) 0%, transparent 60%)',
        'mesh-strong': 'radial-gradient(ellipse 80% 60% at 80% -10%, rgba(45,212,191,0.18) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 40% 110%, rgba(245,158,11,0.12) 0%, transparent 55%)',
        'gradient-cta': 'linear-gradient(135deg, #2dd4bf 0%, #f59e0b 100%)',
        'gradient-cta-hover': 'linear-gradient(135deg, #14b8a6 0%, #d97706 100%)',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(45,212,191,0.08) 50%, transparent 100%)',
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      borderRadius: {
        'pill': '50px',
      },
      backdropBlur: {
        xs: '4px',
      },
    },
  },
  plugins: [],
}
