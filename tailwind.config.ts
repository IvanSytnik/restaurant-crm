import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        // Use rgb(var(...) / <alpha-value>) so Tailwind opacity modifiers
        // (text-cream/80, bg-cream/95, border-cream/60, ...) work correctly.
        cream:        'rgb(var(--cream-rgb) / <alpha-value>)',
        'cream-soft': 'rgb(var(--cream-soft-rgb) / <alpha-value>)',
        ink:          'rgb(var(--ink-rgb) / <alpha-value>)',
        'ink-soft':   'rgb(var(--ink-soft-rgb) / <alpha-value>)',
        accent:       'rgb(var(--accent-rgb) / <alpha-value>)',
      },
      borderColor: {
        DEFAULT: 'var(--border)',
      },
      maxWidth: {
        '8xl': '88rem',
      },
    },
  },
  plugins: [],
}

export default config
