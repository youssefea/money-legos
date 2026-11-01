import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { baseSans, baseSansMono } from "./fonts";
import { THEME_SCRIPT } from "@/lib/theme";
import "../styles/globals.css";

const description = "Snap Base bricks together. Preview a money app. Copy the prompt for your coding agent.";

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
  // theme-color (#ffffff light, #0a0b0d dark) is set by THEME_SCRIPT and the header toggle, not here.
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-theme is "light" on the server; THEME_SCRIPT may set "dark" before paint, so the attribute can differ at hydration.
    <html lang="en" className={`${baseSans.variable} ${baseSansMono.variable}`} data-theme="light" suppressHydrationWarning>
      <head>
        {/* Apply the stored theme before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
