import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "DineFlow", description: "Restaurant management for every kind of restaurant", manifest: "/manifest.json" };
export const viewport: Viewport = { themeColor: "#ea580c", width: "device-width", initialScale: 1 };

const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
