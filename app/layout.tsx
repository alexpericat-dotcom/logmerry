import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, IBM_Plex_Mono, Pixelify_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "LogMerry",
  description: "Cockpit personnel pour piloter une activité de conseil No-Code / IA.",
};

// Hanken Grotesk (interface, titres, corps) et IBM Plex Mono (chiffres) remplacent Geist : DESIGN.md, Typography.
const sans = Hanken_Grotesk({ display: "swap", subsets: ["latin"], variable: "--font-sans" });
// Bricolage Grotesque 700 : le nom « LogMerry » seulement (logotype).
const brand = Bricolage_Grotesque({ display: "swap", subsets: ["latin"], weight: ["700"], variable: "--font-brand" });
// Pixelify Sans : titres et étiquettes seulement (jamais le texte courant), classe `font-pixel`.
const pixel = Pixelify_Sans({ display: "swap", subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-pixel" });
const mono = IBM_Plex_Mono({ display: "swap", subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} ${brand.variable} ${pixel.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
