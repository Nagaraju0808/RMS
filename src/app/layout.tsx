import "./globals.css";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";

// Self-hosted at build time by next/font (works offline once built).
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex", display: "swap" });

export const metadata: Metadata = { title: "DineFlow", description: "Restaurant management for every kind of restaurant", manifest: "/manifest.json" };
export const viewport: Viewport = { themeColor: "#f3f6f1", width: "device-width", initialScale: 1 };

// Register the service worker in production builds only (it would fight hot reload in development).
const swScript = process.env.NODE_ENV === "production" ? `if('serviceWorker' in navigator)addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})` : "";
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plex.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript + ";" + swScript }} /><link rel="apple-touch-icon" href="/icons/icon-192.png" /></head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
