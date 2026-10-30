import { createContext, useContext } from "react";

/**
 * Per-canvas animation tracker. Bricks register while they move so the expensive AO pass can sit
 * out moving frames, and the frame-rate probe only measures frames that are part of an animation.
 */
export class MotionStore {
  private active = 0;
  /** Time (performance.now) the last animation ended; AO fades in from here. */
  lastEnd = 0;
  start() {
    this.active++;
  }
  end() {
    this.active = Math.max(0, this.active - 1);
    if (this.active === 0) this.lastEnd = performance.now();
  }
  get busy() {
    return this.active > 0;
  }
}

export const MotionContext = createContext<MotionStore | null>(null);

export function useMotion(): MotionStore {
  const m = useContext(MotionContext);
  if (!m) throw new Error("useMotion outside MotionContext");
  return m;
}
