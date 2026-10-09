/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        crt: { bg: '#050805', panel: '#0a120a', green: '#33ff66', dim: '#1f8f3c', red: '#ff2a2a' },
      },
      keyframes: {
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
        // редкие вспышки: 85% времени текст стоит спокойно, остальное — рывки
        glitchText: {
          '0%,84%,100%': { transform: 'translate(0)', textShadow: 'none' },
          '86%': { transform: 'translate(-2px,1px)', textShadow: '2px 0 #ff2a2a,-2px 0 #33ff66' },
          '90%': { transform: 'translate(2px,-1px) skewX(6deg)', textShadow: '-2px 0 #ff2a2a,2px 0 #33ff66' },
          '94%': { transform: 'translate(-1px,0)', textShadow: '1px 0 #33ff66' },
        },
        avatarGlitch: {
          '0%,100%': { transform: 'translate(0)', filter: 'invert(0)' },
          '15%': { transform: 'translate(-3px,2px)', filter: 'invert(1)' },
          '30%': { transform: 'translate(3px,-2px)', filter: 'invert(0)' },
          '45%': { transform: 'translate(-2px,-1px)', filter: 'invert(1)' },
          '60%': { transform: 'translate(2px,1px)', filter: 'invert(0)' },
          '75%': { transform: 'translate(0,2px)', filter: 'invert(1)' },
        },
        flicker: {
          '0%,100%': { opacity: '1' },
          '46%': { opacity: '1' }, '48%': { opacity: '.6' }, '50%': { opacity: '1' },
          '78%': { opacity: '.8' }, '80%': { opacity: '1' },
        },
      },
      animation: {
        blink: 'blink 1s steps(1) infinite',
        'glitch-text': 'glitchText 3s steps(1,end) infinite',
        'avatar-glitch': 'avatarGlitch .45s steps(1,end) 3',
        flicker: 'flicker 5s linear infinite',
      },
    },
  },
  plugins: [],
};
