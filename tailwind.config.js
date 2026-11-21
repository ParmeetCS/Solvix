/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Disable Tailwind's preflight/base reset so the existing landing page
  // (styled entirely in App.css) is not affected. Only utility classes are emitted.
  corePlugins: {
    preflight: false,
  },
}
