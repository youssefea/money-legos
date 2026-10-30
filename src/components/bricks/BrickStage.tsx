"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { BrickStageProps } from "@/lib/contract";
import { detectRenderer, markSlow } from "./core/capability";
import type { GhostRect } from "./core/ghost";
import { DEFAULT_FRAMING, stackLabel, type Framing } from "./core/layout";
import SvgBrickStage from "./svg/SvgBrickStage";
import styles from "./BrickStage.module.css";

export type { GhostRect } from "./core/ghost";
export type { Framing } from "./core/layout";

export type BrickStageViewProps = BrickStageProps & {
  /**
   * Framing inside the container (it fills it: size the container, the board fits itself).
   * Default: baseplate 88% of the width, the 4-brick tower kept inside 94% of the height.
   */
  framing?: Partial<Framing>;
  /** Called with the ghost slot's box in this element's CSS px whenever it moves (null = stack full). */
  onGhostRect?: (rect: GhostRect | null) => void;
};

const Stage3D = lazy(() => import("./three/Stage3D"));

const noSubscribe = () => () => {};
const serverSnapshot = () => null;

/**
 * The board: a live 3D baseplate with the stack of placed bricks (one react-three-fiber canvas that
 * renders only while something moves), and the dashed, numbered ghost where the next brick lands.
 *
 * The SVG board doubles as the poster while three.js loads, and stays as the board when WebGL is
 * missing, software-rendered (SwiftShader) or measured below 20 fps. `?bricks=svg|webgl` forces one.
 *
 * Motion: an added brick drops ~14 mm and lands with a 6% squash (~300 ms); a removed brick lifts off
 * and fades, bricks above slide down. `reducedMotion` places bricks at once. `onSettled(id)` fires when
 * a brick added after the first render has landed, and for each brick after the hop started by
 * changing `settledSignal` (the Generate moment; 60 ms stagger, bottom first).
 */
export default function BrickStage(props: BrickStageViewProps) {
  const { bricks, nextLevel, className, onSettled, onGhostRect } = props;
  const { plateFill = DEFAULT_FRAMING.plateFill, maxH = DEFAULT_FRAMING.maxH, maxW = DEFAULT_FRAMING.maxW } = props.framing ?? {};
  const framing = useMemo<Framing>(() => ({ plateFill, maxH, maxW }), [plateFill, maxH, maxW]);
  const det = useSyncExternalStore(noSubscribe, detectRenderer, serverSnapshot);
  const [slow, setSlow] = useState(false);
  const [ready, setReady] = useState(false);
  const mode = det === null ? "pending" : det.renderer === "svg" || slow ? "svg" : "webgl";
  const show3D = mode === "webgl" && ready;

  const forced = det?.forced ?? false;
  const onSlow = useCallback(() => {
    if (forced) return;
    markSlow();
    setSlow(true);
  }, [forced]);
  const onReady = useCallback(() => setReady(true), []);
  const root = useRef<HTMLDivElement>(null);
  const onFps = useCallback((fps: number) => root.current?.setAttribute("data-fps", fps.toFixed(0)), []);

  // Only the visible renderer reports landings.
  const live = useRef({ show3D, onSettled, onGhostRect });
  useEffect(() => {
    live.current = { show3D, onSettled, onGhostRect };
  });
  // Each renderer reports its ghost; only the visible one's reaches the caller (re-sent on a switch).
  const rects = useRef<{ svg: GhostRect | null; gl: GhostRect | null }>({ svg: null, gl: null });
  const svgGhost = useCallback((r: GhostRect | null) => {
    rects.current.svg = r;
    if (!live.current.show3D) live.current.onGhostRect?.(r);
  }, []);
  const glGhost = useCallback((r: GhostRect | null) => {
    rects.current.gl = r;
    if (live.current.show3D) live.current.onGhostRect?.(r);
  }, []);
  useEffect(() => {
    live.current.onGhostRect?.(show3D ? rects.current.gl : rects.current.svg);
  }, [show3D]);
  const svgSettled = useCallback((id: string) => {
    if (!live.current.show3D) live.current.onSettled?.(id);
  }, []);
  const glSettled = useCallback((id: string) => {
    if (live.current.show3D) live.current.onSettled?.(id);
  }, []);

  const inner = { ...props, className: undefined, framing, onGhostRect: undefined };
  return (
    <div
      ref={root}
      className={[styles.root, className].filter(Boolean).join(" ")}
      role="img"
      aria-label={stackLabel(bricks, nextLevel)}
      data-testid="brick-stage"
      data-renderer={mode}
      data-ready={mode === "svg" || show3D ? "true" : "false"}
      data-bricks={bricks.length}
      data-next-level={nextLevel ?? "full"}
    >
      <div className={[styles.layer, show3D ? styles.hidden : ""].join(" ")}>
        <SvgBrickStage {...inner} onSettled={svgSettled} onGhostRect={svgGhost} decorative />
      </div>
      {mode === "webgl" && (
        <Suspense fallback={null}>
          <div className={styles.layer} style={{ opacity: show3D ? 1 : 0 }}>
            <Stage3D {...inner} onSettled={glSettled} onGhostRect={glGhost} onReady={onReady} onSlow={onSlow} onFps={onFps} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
