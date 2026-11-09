/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '8mb' } },
  images: { remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }] }
};
export default nextConfig;
