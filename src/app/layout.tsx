import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { baseSans, baseSansMono } from "./fonts";
import "../styles/globals.css";

const description = "Pick 2 to 4 Base building blocks. Get an app idea and a prompt for your coding agent.";

export const metadata: Metadata = {
  title: "Money Legos | Base",
  description,
  applicationName: "Money Legos",
  icons: { icon: [{ url: (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/brand/Base_square_blue.svg", type: "image/svg+xml" }] },
  openGraph: { title: "Money Legos", description, type: "website" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0d" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${baseSans.variable} ${baseSansMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
