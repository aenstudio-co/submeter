import type { Metadata, Viewport } from "next";
import "@fontsource-variable/familjen-grotesk";
import "@fontsource-variable/martian-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Room sub meter",
  description: "Shared electricity sub meter for Shane, Kris and Hannah",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
