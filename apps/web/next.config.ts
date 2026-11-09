import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  // Les photos de recettes passent par les Server Actions (réduites à moins de 1 Mo avant l'envoi)
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
  // Foyer et Profil sont réunis dans Réglages : les anciennes adresses y mènent.
  async redirects() {
    return [
      { source: '/household', destination: '/settings', permanent: false },
      { source: '/profile', destination: '/settings', permanent: false },
    ]
  },
};

export default nextConfig;
