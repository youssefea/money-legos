"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { BrickLayoutItem, BrickStageProps } from "@/lib/contract";
import { detectRenderer, markSlow } from "./core/capability";
import type { GhostRect } from "./core/ghost";
import { DEFAULT_FRAMING, stackLabel, type Framing } from "./core/layout";
import type { BoardFrame } from "./three/Scene";
import SvgBrickStage from "./svg/SvgBrickStage";
import styles from "./BrickStage.module.css";

export type { GhostRect } from "./core/ghost";
export type { Framing } from "./core/layout";
export type { BoardFrame } from "./three/Scene";

export type BrickStageViewProps = BrickStageProps & {
  /**
   * Framing inside the container (it fills it: size the container, the board fits itself).
   * Default: baseplate up to 97% of the width with >= 24 px (max 8.3% of the width) clear at each
   * side, the 4-brick tower kept inside 97% of the height, and the board box (plate + full tower)
   * centred and lifted by 2% of the height. Fitted once per size: the board never pans on an add.
   */
  framing?: Partial<Framing>;
  /** Footprint [w, d] in studs of the brick that lands next, when known (e.g. the hovered tray brick): sizes the ghost. Default 2x4. */
  ghostSize?: [number, number];
  /**
   * Called with the ghost slot's box in this element's CSS px (and its footprint) whenever it changes
   * (null = stack full). Also on the root as `data-ghost="x,y,width,height"` (px).
   */
  onGhostRect?: (rect: GhostRect | null) => void;
  /**
   * Framing readout whenever the board moves: `stackTop` is the top of the stack (or of the ghost slot
   * while there is one) as a fraction of this element's height, for a caption 16 px above it
   * (top = stackTop * height - 16 - captionHeight). Also on the root as `data-stack-top`.
   */
  onFrame?: (f: BoardFrame) => void;
};

const Stage3D = lazy(() => import("./three/Stage3D"));

const noSubscribe = () => () => {};
const serverSnapshot = () => null;

/**
 * The board: a live 3D baseplate with the stack of placed bricks (one react-three-fiber canvas that
 * renders only while something moves), and the ghost (a see-through, numbered brick volume) where the
 * next brick lands. The camera is fitted once for a full 4-brick tower and never moves on an add.
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
  const { bricks, nextLevel, className, onSettled, onGhostRect, onFrame, onLayout } = props;
  const f = { ...DEFAULT_FRAMING, ...props.framing };
  const { plateFill, maxH, maxW, side, sideMax, bias } = f;
  const framing = useMemo<Framing>(() => ({ plateFill, maxH, maxW, side, sideMax, bias }), [plateFill, maxH, maxW, side, sideMax, bias]);
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
  const live = useRef({ show3D, onSettled, onGhostRect, onFrame, onLayout });
  useEffect(() => {
    live.current = { show3D, onSettled, onGhostRect, onFrame, onLayout };
  });
  // onLayout: each renderer reports its brick boxes; the visible one's go out, at most once a frame
  // (rAF-debounced), and again after each landing and when the renderer switches.
  const layouts = useRef<{ svg: BrickLayoutItem[] | null; gl: BrickLayoutItem[] | null }>({ svg: null, gl: null });
  const raf = useRef(0);
  const emitLayout = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const items = live.current.show3D ? layouts.current.gl : layouts.current.svg;
      if (items) live.current.onLayout?.(items);
    });
  }, []);
  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
    },
    [],
  );
  const svgLayout = useCallback(
    (items: BrickLayoutItem[]) => {
      layouts.current.svg = items;
      if (!live.current.show3D) emitLayout();
    },
    [emitLayout],
  );
  const glLayout = useCallback(
    (items: BrickLayoutItem[]) => {
      layouts.current.gl = items;
      if (live.current.show3D) emitLayout();
    },
    [emitLayout],
  );
  // Each renderer reports its ghost; only the visible one's reaches the caller (re-sent on a switch).
  const rects = useRef<{ svg: GhostRect | null; gl: GhostRect | null }>({ svg: null, gl: null });
  const sendGhost = (r: GhostRect | null) => {
    if (r) root.current?.setAttribute("data-ghost", [r.x, r.y, r.width, r.height].map((n) => n.toFixed(1)).join(","));
    else root.current?.removeAttribute("data-ghost");
    live.current.onGhostRect?.(r);
  };
  const svgGhost = useCallback((r: GhostRect | null) => {
    rects.current.svg = r;
    if (!live.current.show3D) sendGhost(r);
  }, []);
  const glGhost = useCallback((r: GhostRect | null) => {
    rects.current.gl = r;
    if (live.current.show3D) sendGhost(r);
  }, []);
  const frames = useRef<{ svg: BoardFrame | null; gl: BoardFrame | null }>({ svg: null, gl: null });
  const sendFrame = (fr: BoardFrame | null) => {
    if (!fr) return;
    root.current?.setAttribute("data-stack-top", fr.stackTop.toFixed(4));
    live.current.onFrame?.(fr);
  };
  const svgFrame = useCallback((fr: BoardFrame) => {
    frames.current.svg = fr;
    if (!live.current.show3D) sendFrame(fr);
  }, []);
  const glFrame = useCallback((fr: BoardFrame) => {
    frames.current.gl = fr;
    if (live.current.show3D) sendFrame(fr);
  }, []);
  useEffect(() => {
    sendGhost(show3D ? rects.current.gl : rects.current.svg);
    sendFrame(show3D ? frames.current.gl : frames.current.svg);
    emitLayout();
  }, [show3D, emitLayout]);
  const svgSettled = useCallback(
    (id: string) => {
      if (live.current.show3D) return;
      live.current.onSettled?.(id);
      emitLayout();
    },
    [emitLayout],
  );
  const glSettled = useCallback(
    (id: string) => {
      if (!live.current.show3D) return;
      live.current.onSettled?.(id);
      emitLayout();
    },
    [emitLayout],
  );

  const inner = { ...props, className: undefined, framing, onGhostRect: undefined, onFrame: undefined, onLayout: undefined };
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
        <SvgBrickStage {...inner} onSettled={svgSettled} onGhostRect={svgGhost} onFrame={svgFrame} onLayout={svgLayout} decorative />
      </div>
      {mode === "webgl" && (
        <Suspense fallback={null}>
          <div className={styles.layer} style={{ opacity: show3D ? 1 : 0 }}>
            <Stage3D {...inner} onSettled={glSettled} onGhostRect={glGhost} onFrame={glFrame} onLayout={glLayout} onReady={onReady} onSlow={onSlow} onFps={onFps} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
