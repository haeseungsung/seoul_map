/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force clean build
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

module.exports = nextConfig;
