import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Bricks (dev)", robots: { index: false, follow: false } };

/**
 * Dev-only test page for the brick layer. Only built when NEXT_PUBLIC_DEV=1 (e.g.
 * `NEXT_PUBLIC_DEV=1 npm run dev`, then /dev/bricks/); otherwise this route is a 404.
 */
export default async function DevBricksPage() {
  if (process.env.NEXT_PUBLIC_DEV !== "1") notFound();
  const { default: DevBricksLoader } = await import("./DevBricksLoader");
  return <DevBricksLoader />;
}
