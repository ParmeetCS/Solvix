/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Several dev servers can run side by side if each one uses its own build folder
  // (set NEXT_DIST_DIR=.next-2, .next-3, ...). Normally this stays ".next".
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // The "@/..." import alias is defined in jsconfig.json (works with webpack and Turbopack).
};
