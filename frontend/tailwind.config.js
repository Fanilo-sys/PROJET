/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  screens: {
    'xs': '480px',
    'sm': '640px',
    'md': '768px',
    'lg': '1024px',
    'xl': '1280px',
    '2xl': '1536px',
  },
  extend: {
    keyframes: {
      'fade-in-up': {
        from: { opacity: '0', transform: 'translateY(8px)' },
        to: { opacity: '1', transform: 'translateY(0)' },
      },
      'slide-in-left': {
        from: { opacity: '0', transform: 'translateX(-48px)' },
        to: { opacity: '1', transform: 'translateX(0)' },
      },
      'slide-in-right': {
        from: { opacity: '0', transform: 'translateX(48px)' },
        to: { opacity: '1', transform: 'translateX(0)' },
      },
      'slide-out-right': {
        from: { opacity: '1', transform: 'translateX(0)' },
        to: { opacity: '0', transform: 'translateX(48px)' },
      },
      'error-shake': {
        '0%,100%': { transform: 'translateX(0)' },
        '20%': { transform: 'translateX(-6px)' },
        '40%': { transform: 'translateX(6px)' },
        '60%': { transform: 'translateX(-4px)' },
        '80%': { transform: 'translateX(4px)' },
      },
      'error-bounce': {
        '0%,100%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.25)' },
      },
      'gradient-shift': {
        '0%, 100%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' },
      },
      'float-in': {
        '0%': { opacity: '0', transform: 'translateY(30px) scale(0.96)' },
        '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
      },
      'gentle-float': {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-12px)' },
      },
      'pulse-icon': {
        '0%, 100%': { boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.2)' },
        '50%': { boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.2), 0 0 20px rgba(5,150,105,0.3)' },
      },
    },
    animation: {
      'fade-in-up': 'fade-in-up 0.3s ease-out both',
      'slide-in-left': 'slide-in-left 0.7s ease-out both',
      'slide-in-right': 'slide-in-right 0.7s ease-out both',
      'slide-out-right': 'slide-out-right 0.5s ease-in both',
      'error-shake': 'error-shake 0.5s ease',
      'error-bounce': 'error-bounce 0.35s ease',
      'gradient-shift': 'gradient-shift 8s ease infinite',
      'float-in': 'float-in 0.6s ease-out both',
      'gentle-float': 'gentle-float 6s ease-in-out infinite',
      'pulse-icon': 'pulse-icon 3s ease-in-out infinite',
    },
  },
  plugins: [],
}
