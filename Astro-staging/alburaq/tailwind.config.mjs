/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   '#D5182B',
        dark:      '#1F232B',
        light:     '#E9E9E9',
        muted:     '#6A737D',
      },
      fontFamily: {
        heading: ['Osande', 'sans-serif'],
        body:    ['"Libre Franklin"', 'sans-serif'],
        ui:      ['Manrope', 'sans-serif'],
      },
      maxWidth: {
        container: '1180px',
      },
    },
  },
  plugins: [],
};
