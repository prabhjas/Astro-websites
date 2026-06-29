/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   '#6EC1E4',
        secondary: '#54595F',
        muted:     '#7A7A7A',
        accent:    '#61CE70',
        dark:      '#1A1A1A',
      },
      fontFamily: {
        sans:  ['Roboto', 'ui-sans-serif', 'sans-serif'],
        serif: ['"Roboto Slab"', 'ui-serif', 'serif'],
        alt:   ['Manrope', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
