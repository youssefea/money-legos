"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { BrickStageProps } from "@/lib/contract";
import { detectRenderer, markSlow } from "./core/capability";
import { stackLabel } from "./core/layout";
import SvgBrickStage from "./svg/SvgBrickStage";
import styles from "./BrickStage.module.css";

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
export default function BrickStage(props: BrickStageProps) {
  const { bricks, nextLevel, className, onSettled } = props;
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
  const live = useRef({ show3D, onSettled });
  useEffect(() => {
    live.current = { show3D, onSettled };
  });
  const svgSettled = useCallback((id: string) => {
    if (!live.current.show3D) live.current.onSettled?.(id);
  }, []);
  const glSettled = useCallback((id: string) => {
    if (live.current.show3D) live.current.onSettled?.(id);
  }, []);

  const inner = { ...props, className: undefined };
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
        <SvgBrickStage {...inner} onSettled={svgSettled} decorative />
      </div>
      {mode === "webgl" && (
        <Suspense fallback={null}>
          <div className={styles.layer} style={{ opacity: show3D ? 1 : 0 }}>
            <Stage3D {...inner} onSettled={glSettled} onReady={onReady} onSlow={onSlow} onFps={onFps} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
