export type Renderer = "webgl" | "svg";

const SLOW_KEY = "money-legos:bricks-slow";
let cached: { renderer: Renderer; forced: boolean } | null = null;

/** `?bricks=svg` or `?bricks=webgl` forces a renderer (QA and screenshots). */
function forced(): Renderer | null {
  const q = new URLSearchParams(window.location.search).get("bricks");
  return q === "svg" || q === "webgl" ? q : null;
}

/**
 * Picks the board renderer once per page: SVG when WebGL 2 is missing, only available with a major
 * performance caveat, backed by a software rasteriser (SwiftShader, llvmpipe), or when an earlier
 * board in this session measured under 20 fps.
 */
export function detectRenderer(): { renderer: Renderer; forced: boolean } {
  if (cached) return cached;
  const f = forced();
  if (f) return (cached = { renderer: f, forced: true });
  try {
    if (window.sessionStorage.getItem(SLOW_KEY) === "1") return (cached = { renderer: "svg", forced: false });
  } catch {
    // storage blocked: just detect
  }
  let renderer: Renderer = "svg";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      renderer = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name) ? "svg" : "webgl";
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    renderer = "svg";
  }
  return (cached = { renderer, forced: false });
}

/** Remember for this session that the live board was too slow, and use SVG from now on. */
export function markSlow() {
  if (cached && !cached.forced) cached = { renderer: "svg", forced: false };
  try {
    window.sessionStorage.setItem(SLOW_KEY, "1");
  } catch {
    // ignore
  }
}
