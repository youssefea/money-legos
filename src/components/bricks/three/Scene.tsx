"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { BrickLayoutItem, PlacedBrick } from "@/lib/contract";
import { ghostGeom, type GhostGeom } from "../core/ghost";
import { DIM } from "../core/dims";
import { BASEPLATE, BOARD, DEFAULT_FRAMING, FOV, GHOST_SIZE, VIEW, boxCorners, byLevel, coversFor, frameBox, brickLayoutItems, plateCorners, plateFraction, stackTopY, type Framing, type V3 } from "../core/layout";
import { AO } from "./AO";
import { Baseplate } from "./Baseplate";
import { MotionContext, MotionStore, useMotion } from "./motion";
import { StackBrick } from "./StackBrick";
import { Studio } from "./Studio";

/** Where the board's visible top is, as a fraction of the canvas height (0 = top edge). */
export type BoardFrame = { stackTop: number; platePx: number };

/**
 * Frames the board ONCE for the canvas size (and the framing): the baseplate spans
 * `plateFraction(framing)` of the width unless the full 4-brick tower would then overflow, and the
 * board box (plate + full tower) is centred, lifted by `framing.bias` of the height. The camera never
 * depends on the stack, so it never pans or re-zooms on an add: the plate is the fixed desk.
 * After every change it projects the ghost marker into canvas px, reports the top of the stack/ghost
 * so UI can sit a caption above it, and the bricks' front faces for `onLayout`.
 */
function CameraRig({ bricks, nextLevel, ghostSize, framing, onGhost, onFrame, onLayout }: { bricks: PlacedBrick[]; nextLevel: number | null; ghostSize: [number, number]; framing: Framing; onGhost: (g: GhostGeom | null) => void; onFrame?: (f: BoardFrame) => void; onLayout?: (items: BrickLayoutItem[]) => void }) {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const { plateFill, maxH, maxW, side, sideMax, bias } = framing;
  const fitted = useRef("");
  // By value: a caller may pass a fresh [w, d] array on every render.
  const ghostKey = ghostSize.join("x");
  const live = useRef({ onGhost, onFrame, onLayout });
  useLayoutEffect(() => {
    live.current = { onGhost, onFrame, onLayout };
  });

  useLayoutEffect(() => {
    if (size.width === 0 || size.height === 0) return;
    function fit(camera: THREE.PerspectiveCamera) {
      const fill = plateFraction({ plateFill, maxH, maxW, side, sideMax, bias }, size.width);
      const corners = boxCorners(frameBox()).map((p) => new THREE.Vector3(...p));
      const plate = plateCorners().map((p) => new THREE.Vector3(...p));
      const dir = new THREE.Vector3(...VIEW).normalize();
      const { min, max } = frameBox();
      const target = new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
      camera.fov = FOV;
      camera.aspect = size.width / size.height;
      const place = (dist: number) => {
        camera.position.copy(target).addScaledVector(dir, dist);
        camera.near = dist / 10;
        camera.far = dist * 4;
        camera.lookAt(target);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
      };
      const extent = (pts: THREE.Vector3[]) => {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const c of pts) {
          const p = c.clone().project(camera);
          x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
        }
        return { x0, x1, y0, y1 };
      };
      // Too close when the plate is wider than its share, or the full board box leaves maxW x maxH (NDC spans 2).
      const tooClose = () => {
        const p = extent(plate);
        const b = extent(corners);
        return p.x1 - p.x0 > 2 * fill || b.y1 - b.y0 > 2 * maxH || b.x1 - b.x0 > 2 * maxW || Math.max(-b.x0, b.x1, -b.y0, b.y1) > 0.995;
      };
      const halfH = () => Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * camera.position.distanceTo(target);
      const shift = (dx: number, dy: number) => {
        // Moves the projected scene by (dx, dy) NDC.
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
        const h = halfH();
        const d = right.multiplyScalar(-dx * h * camera.aspect).addScaledVector(up, -dy * h);
        target.add(d);
        camera.position.add(d);
        camera.updateMatrixWorld();
      };
      // Fit the distance with the full board box centred.
      for (let pass = 0; pass < 3; pass++) {
        let lo = 20, hi = 4000;
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2;
          place(mid);
          if (tooClose()) lo = mid; else hi = mid;
        }
        place(hi);
        const e = extent(corners);
        shift(-(e.x0 + e.x1) / 2, -(e.y0 + e.y1) / 2);
      }
      // Lift by `bias`, never pushing the board box out of frame.
      const e = extent(corners);
      shift(0, Math.max(-0.985 - e.y0, Math.min(0.985 - e.y1, 2 * bias)));
    }

    /** Projects the ghost, the stack top and the front faces with the (fixed) camera. */
    function report() {
      const { camera, size: sz, gl } = get();
      const project = (p: V3): [number, number] => {
        const v = new THREE.Vector3(...p).project(camera);
        return [((v.x + 1) / 2) * sz.width, ((1 - v.y) / 2) * sz.height];
      };
      live.current.onLayout?.(brickLayoutItems(bricks, project, sz.width, sz.height));
      live.current.onGhost(nextLevel === null ? null : ghostGeom(nextLevel, project, ghostSize));
      // Highest projected point of the top of the stack/ghost (the rear corners sit highest on screen).
      const t = stackTopY(bricks, nextLevel);
      const gw = (ghostSize[0] * DIM.pitch) / 2, gd = (ghostSize[1] * DIM.pitch) / 2;
      let y = Infinity;
      for (const x of [-gw, gw]) for (const z of [-gd, gd]) y = Math.min(y, project([x, t, z])[1]);
      const stackTop = sz.height > 0 ? Math.max(0, y / sz.height) : 0;
      const plate = plateCorners().map((p) => project(p)[0]);
      const platePx = Math.max(...plate) - Math.min(...plate);
      gl.domElement.dataset.platePx = platePx.toFixed(0);
      gl.domElement.dataset.stackTop = stackTop.toFixed(4);
      gl.domElement.dataset.camera = camera.position.toArray().map((n) => n.toFixed(2)).join(",");
      live.current.onFrame?.({ stackTop, platePx });
    }

    // Fit: depends on the canvas size and the framing only, never on the stack.
    const key = `${size.width}x${size.height}:${plateFill},${maxH},${maxW},${side},${sideMax},${bias}`;
    if (fitted.current !== key) {
      fitted.current = key;
      fit(get().camera as THREE.PerspectiveCamera);
    }
    report();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ghostSize is tracked by value (ghostKey)
  }, [get, size, invalidate, plateFill, maxH, maxW, side, sideMax, bias, bricks, nextLevel, ghostKey]);

  return null;
}

/**
 * Frame-rate probe. Warm-up renders a handful of frames at mount, then every animation frame is timed.
 * A median frame time above 50 ms (< 20 fps) or a software renderer reports `onSlow`.
 */
function PerfProbe({ onReady, onSlow, onFps }: { onReady?: () => void; onSlow?: () => void; onFps?: (fps: number) => void }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const motion = useMotion();
  const st = useRef({ frames: 0, last: 0, samples: [] as number[], reported: false, ready: false });
  useEffect(() => {
    const ctx = gl.getContext();
    const ext = ctx.getExtension("WEBGL_debug_renderer_info");
    const name = String(ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER));
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name)) {
      st.current.reported = true;
      onSlow?.();
    }
    invalidate();
    const lost = (e: Event) => {
      e.preventDefault();
      onSlow?.();
    };
    const el = gl.domElement;
    el.addEventListener("webglcontextlost", lost);
    // A GPU so slow that the 14 warm-up frames take over 3 s never fills a sample window: catch it here.
    const visible = document.visibilityState === "visible";
    const timer = window.setTimeout(() => {
      const s = st.current;
      if (visible && document.visibilityState === "visible" && !s.reported && s.frames < 14) {
        s.reported = true;
        onSlow?.();
      }
    }, 3000);
    return () => {
      el.removeEventListener("webglcontextlost", lost);
      window.clearTimeout(timer);
    };
  }, [gl, invalidate, onSlow]);
  const warmEnd = useRef(() => {});
  // Warm-up frames count as motion: they time the plain render path (AO waits, then fades in).
  useEffect(() => {
    motion.start();
    let held = true;
    warmEnd.current = () => {
      if (held) motion.end();
      held = false;
    };
    return () => warmEnd.current();
  }, [motion]);
  useFrame(() => {
    const s = st.current;
    const now = performance.now();
    const dt = now - s.last;
    s.last = now;
    s.frames++;
    const warm = s.frames <= 14;
    if (warm) invalidate();
    else if (s.frames === 15) warmEnd.current();
    if (!s.ready && s.frames >= 2) {
      s.ready = true;
      onReady?.();
    }
    if (s.reported) return;
    if ((warm && s.frames > 5) || (motion.busy && s.frames > 15)) {
      if (dt > 0 && dt < 1000) s.samples.push(dt);
    }
    if (s.samples.length >= 8) {
      const sorted = [...s.samples].sort((a, b) => a - b);
      const median = sorted[sorted.length >> 1]!;
      onFps?.(1000 / median);
      if (median > 50) {
        s.reported = true;
        onSlow?.();
      }
      s.samples = [];
    }
  });
  return null;
}

export type SceneProps = {
  bricks: PlacedBrick[];
  nextLevel: number | null;
  dark: boolean;
  reducedMotion: boolean;
  settledSignal?: number;
  onSettled?: (id: string) => void;
  fontsReady: boolean;
  ao: boolean;
  framing?: Framing;
  onGhost: (g: GhostGeom | null) => void;
  onReady?: () => void;
  onSlow?: () => void;
  onFps?: (fps: number) => void;
  onFrame?: (f: BoardFrame) => void;
  /** Footprint [w, d] of the next brick for the ghost volume (default a 2x4). */
  ghostSize?: [number, number];
  /** Front-face boxes of the placed bricks (see BrickStageProps.onLayout), at the final framing. */
  onLayout?: (items: BrickLayoutItem[]) => void;
};

type Shown = { brick: PlacedBrick; leaving: boolean };

export function Scene(props: SceneProps) {
  const { bricks, nextLevel, dark, reducedMotion, settledSignal = 0, onSettled, fontsReady, ao, framing = DEFAULT_FRAMING, onGhost, onReady, onSlow, onFps, onFrame, onLayout, ghostSize = GHOST_SIZE } = props;
  const [motion] = useState(() => new MotionStore());

  // Bricks present at first render appear in place; later ones drop in.
  const [initial, setInitial] = useState(() => new Set(bricks.map((b) => b.id)));
  // Remember removed bricks until their lift-off animation ends.
  const [prev, setPrev] = useState(bricks);
  const [leaving, setLeaving] = useState<PlacedBrick[]>([]);
  if (prev !== bricks) {
    const now = new Set(bricks.map((b) => b.id));
    const gone = prev.filter((b) => !now.has(b.id));
    setPrev(bricks);
    if (gone.length > 0 || leaving.some((b) => now.has(b.id))) {
      setLeaving((l) => [...l.filter((b) => !now.has(b.id)), ...gone.filter((g) => !l.some((b) => b.id === g.id))]);
    }
    if (gone.some((b) => initial.has(b.id))) {
      setInitial((s) => new Set([...s].filter((id) => now.has(id))));
    }
  }
  const shown: Shown[] = [...byLevel(bricks).map((brick) => ({ brick, leaving: false })), ...leaving.map((brick) => ({ brick, leaving: true }))];
  const onLeft = useCallback((id: string) => setLeaving((l) => l.filter((b) => b.id !== id)), []);
  const covers = coversFor(bricks);
  const c = dark ? BOARD.dark : BOARD.light;
  const [debug] = useState(() => (typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("bricksDebug") ?? "")));

  return (
    <MotionContext.Provider value={motion}>
      <CameraRig bricks={bricks} nextLevel={nextLevel} ghostSize={ghostSize} framing={framing} onGhost={onGhost} onFrame={onFrame} onLayout={onLayout} />
      <Studio dark={dark} floorShadow={!debug.includes("nocontact")} />
      <Baseplate studs={BASEPLATE} color={c.baseplate} dark={dark} />
      {shown.map(({ brick, leaving: isLeaving }, i) => (
        <StackBrick
          key={brick.id}
          brick={brick}
          drop={!initial.has(brick.id)}
          leaving={isLeaving}
          reducedMotion={reducedMotion}
          bounceSignal={settledSignal}
          index={i}
          cover={isLeaving ? null : (covers.get(brick.id) ?? null)}
          fontsReady={fontsReady}
          onSettled={onSettled}
          onLeft={onLeft}
        />
      ))}
      {ao && !debug.includes("noao") && <AO />}
      <PerfProbe onReady={onReady} onSlow={onSlow} onFps={onFps} />
    </MotionContext.Provider>
  );
}
