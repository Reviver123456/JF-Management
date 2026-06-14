/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
