/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Configuración para Docker
  output: 'standalone',
  // Configuración para archivos estáticos
  experimental: {
    outputFileTracingRoot: undefined,
  },
};

module.exports = nextConfig;
