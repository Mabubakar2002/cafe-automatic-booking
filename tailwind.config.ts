import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#1D1B2E', chilli: '#E5412D', sun: '#FFC43D', basil: '#1F7A5A', sage: '#EEF2E9' },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
} satisfies Config
