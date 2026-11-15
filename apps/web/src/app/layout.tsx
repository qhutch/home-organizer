import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import VeilThemeColor from "@/components/ui/VeilThemeColor";
import ServiceWorker from "@/components/ServiceWorker";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
// Police des titres
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "Hestia",
  description: "Organisation du foyer",
  // Ajoutée à l'écran d'accueil de l'iPhone : plein écran, nom « Hestia », barre d'heure sur fond de page
  appleWebApp: {
    capable: true,
    title: "Hestia",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5EFE7",
  // En plein écran, la page va jusqu'aux bords ; les barres fixes gardent la place
  // de la barre de l'iPhone avec env(safe-area-inset-bottom) (voir ActionBar)
  viewportFit: "cover",
  // Android (Chrome) : le clavier réduit la page, pour que les barres du bas restent au-dessus.
  // L'iPhone l'ignore : ActionBar s'y recale elle-même sur le clavier.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`h-full ${sans.variable} ${display.variable}`}>
      <body className="font-sans min-h-full bg-page text-ink">
        {children}
        <VeilThemeColor />
        <ServiceWorker />
      </body>
    </html>
  );
}
