/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dev: opening http://127.0.0.1:3000 blocks /_next/hmr (different host than localhost) → HMR falls back to full reload loops.
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  devIndicators: {
    position: "bottom-right"
  },
  experimental: {
    proxyClientMaxBodySize: "15mb",
    serverActions: {
      bodySizeLimit: "15mb"
    }
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/pwa/icon-192.png",
        permanent: false
      }
    ];
  }
};

export default nextConfig;
