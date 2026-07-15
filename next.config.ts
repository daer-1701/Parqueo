import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  serverExternalPackages: ['nodemailer'],
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'date-fns-tz',
      'recharts',
    ],
  },
};

export default nextConfig;
