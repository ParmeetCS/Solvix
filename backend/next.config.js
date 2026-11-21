/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

const path = require('path');

module.exports = {
  reactStrictMode: true,
  webpack(config, { isServer }) {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib': path.join(__dirname, 'lib'),
        '@/services': path.join(__dirname, 'services'),
        '@/components': path.join(__dirname, 'components'),
      };
    }
    return config;
  },
};