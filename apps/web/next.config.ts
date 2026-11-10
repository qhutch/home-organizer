import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  // Pas de bouton « N » de Next.js en local : il cachait la loupe de la barre du bas.
  devIndicators: false,
  // Les photos de recettes passent par les Server Actions (réduites à moins de 1 Mo avant l'envoi),
  // les documents aussi, en morceaux de 3 Mo (lib/documents/limits.ts)
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  // Foyer et Profil sont réunis dans Réglages : les anciennes adresses y mènent.
  async redirects() {
    return [
      { source: '/household', destination: '/settings', permanent: false },
      { source: '/profile', destination: '/settings', permanent: false },
    ]
  },
};

export default nextConfig;
