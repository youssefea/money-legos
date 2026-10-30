"use client";

import dynamic from "next/dynamic";

// Client only (the page reads its settings from the URL on first render). NEXT_PUBLIC_DEV is inlined
// at build time, so without it the import below is dead code and the dev UI is not emitted.
const DevBricks = process.env.NEXT_PUBLIC_DEV === "1" ? dynamic(() => import("./DevBricks"), { ssr: false }) : () => null;

export default function DevBricksLoader() {
  return <DevBricks />;
}
