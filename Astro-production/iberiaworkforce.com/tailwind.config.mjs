/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fresh, professional palette for Iberia Workforce Solutions.
        // Swap/adjust once the logo arrives.
        brand: {
          50:  '#eef2f7',
          100: '#d5deea',
          200: '#aabdd3',
          300: '#7593b4',
          400: '#456d94',
          500: '#294f77',
          600: '#1e3d5e',
          700: '#182f49',
          800: '#152b47',   // deep navy — matches logo
          900: '#0f2036',
          950: '#0a1626',
        },
        accent: {
          DEFAULT: '#e07a52', // coral/orange — matches logo accent
          light:   '#ec9576',
          dark:    '#c15f38',
        },
        ink:   '#152b47',
        muted: '#5b6b82',
        line:  '#e5e9f0',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        container: '1180px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(10,31,61,0.06), 0 8px 24px -12px rgba(10,31,61,0.18)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
