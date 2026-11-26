/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './popup.html',
    './dashboard.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
