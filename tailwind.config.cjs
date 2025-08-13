module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        accent: '#ff8a00',
        accent2: '#ffb224',
        bg: '#0b0c10',
      },
    },
  },
  plugins: [],
};
/**** Tailwind config ****/
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,html,js,svelte,ts}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0b0c10',
        panel: 'rgba(21,22,26,0.7)',
        accent: '#ff8a00',
        accent2: '#ffb224',
        danger: '#ff5d5d',
      },
      boxShadow: {
        glass: '0 10px 30px rgba(0,0,0,0.35)'
      }
    },
  },
  plugins: [],
}
