import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  // Foyer et Profil sont réunis dans Réglages : les anciennes adresses y mènent.
  async redirects() {
    return [
      { source: '/household', destination: '/settings', permanent: false },
      { source: '/profile', destination: '/settings', permanent: false },
    ]
  },
};

export default nextConfig;
