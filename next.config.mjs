/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
