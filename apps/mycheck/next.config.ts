import type { NextConfig } from 'next';

// F0-R3: Security headers (wajib semua app)
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // reactStrictMode dimatikan saat development untuk menghemat RAM di lingkungan terbatas (WSL 4GB)
  reactStrictMode: process.env.NODE_ENV !== 'development',
  transpilePackages: ['@mochikin/shared', '@mochikin/ui'],
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  experimental: {
    // useTypeScriptCli dipadamkan karena memaksa tsc berjalan sebagai proses terpisah
    // yang boros memori saat `next dev`. Type-check dijalankan secara terpisah
    // melalui `pnpm --filter mycheck typecheck`.
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
