import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/blogs/:year(\\d{4})-:month(\\d{2})-:day(\\d{2})-:slug',
        destination: '/:slug',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;