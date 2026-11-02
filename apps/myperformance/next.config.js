const { resolve } = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@mochikin/shared", "@mochikin/ui"],
  reactStrictMode: true,
  turbopack: {
    root: resolve(__dirname, "../.."),
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
