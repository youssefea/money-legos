import localFont from "next/font/local";

/** Base Sans variable font (upright, 100–900). Self-hosted; no network fonts. */
export const baseSans = localFont({
  src: [{ path: "./fonts/BaseSansVF.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-base-sans",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
});

/** Base Sans Mono variable font (upright, 100–500). */
export const baseSansMono = localFont({
  src: [{ path: "./fonts/BaseSansMonoVF.woff2", weight: "100 500", style: "normal" }],
  variable: "--font-base-sans-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});
