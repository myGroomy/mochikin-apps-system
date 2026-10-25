/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile shared package dari monorepo
  transpilePackages: ['@mochikin/shared'],

  // Strict mode untuk React 19
  reactStrictMode: true,

  // Headers keamanan standar
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
