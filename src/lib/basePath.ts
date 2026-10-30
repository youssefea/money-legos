/** Base path the site is served under ("" in dev, "/money-legos" on GitHub Pages). */
export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefixes a public/ asset path with the base path: asset("/brand/x.svg"). */
export function asset(path: string): string {
  return BASE_PATH + (path.startsWith("/") ? path : "/" + path);
}
