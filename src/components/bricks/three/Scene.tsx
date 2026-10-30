"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PlacedBrick } from "@/lib/contract";
import { ghostGeom, type GhostGeom } from "../core/ghost";
import { BASEPLATE, BOARD, FOV, VIEW, byLevel, frameBox, type V3 } from "../core/layout";
import { AO } from "./AO";
import { Baseplate } from "./Baseplate";
import { MotionContext, MotionStore, useMotion } from "./motion";
import { StackBrick } from "./StackBrick";
import { Studio } from "./Studio";

/** Fits the fixed board box (baseplate + full stack) into the canvas and projects the ghost marker. */
function CameraRig({ nextLevel, onGhost }: { nextLevel: number | null; onGhost: (g: GhostGeom | null) => void }) {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    if (size.width === 0 || size.height === 0) return;
    const camera = get().camera as THREE.PerspectiveCamera;
    const { min, max } = frameBox();
    const corners: THREE.Vector3[] = [];
    for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) corners.push(new THREE.Vector3(x, y, z));
    const dir = new THREE.Vector3(...VIEW).normalize();
    const target = new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    camera.fov = FOV;
    camera.aspect = size.width / size.height;
    const margin = 0.9;
    const place = (dist: number) => {
      camera.position.copy(target).addScaledVector(dir, dist);
      camera.near = dist / 10;
      camera.far = dist * 4;
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    };
    const extent = () => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const c of corners) {
        const p = c.clone().project(camera);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
      return { x0, x1, y0, y1 };
    };
    // Two passes: fit the distance, then re-centre the projected box, then fit again.
    for (let pass = 0; pass < 2; pass++) {
      let lo = 20, hi = 4000;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        place(mid);
        const e = extent();
        if (Math.max(-e.x0, e.x1, -e.y0, e.y1) > margin) lo = mid; else hi = mid;
      }
      place(hi);
      if (pass === 0) {
        const e = extent();
        const cx = (e.x0 + e.x1) / 2, cy = (e.y0 + e.y1) / 2;
        // Shift the target in the camera plane by the off-centre amount.
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
        const dist = camera.position.distanceTo(target);
        const halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * dist;
        target.addScaledVector(right, cx * halfH * camera.aspect).addScaledVector(up, cy * halfH);
      }
    }
    invalidate();
    if (nextLevel === null) onGhost(null);
    else {
      const project = (p: V3): [number, number] => {
        const v = new THREE.Vector3(...p).project(camera);
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
      };
      onGhost(ghostGeom(nextLevel, project));
    }
  }, [get, size, nextLevel, onGhost, invalidate]);
  return null;
}

/** Studio floor: a soft pool of the panel colour that fades into the page, like a studio sweep. */
function Floor({ dark }: { dark: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    // smooth (cosine) falloff that reaches zero well inside the plane, so no edge ever shows
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const a = t >= 0.98 ? 0 : Math.pow(0.5 + 0.5 * Math.cos((Math.PI * t) / 0.98), 1.4);
      const v = Math.round(255 * a); // alphaMap reads the green channel: draw opaque greys
      r.addColorStop(t, `rgb(${v},${v},${v})`);
    }
    g.fillStyle = "#000";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 4]} renderOrder={-1}>
      <planeGeometry args={[260, 210]} />
      <meshBasicMaterial color={dark ? BOARD.dark.floor : BOARD.light.floor} alphaMap={tex} transparent opacity={dark ? 0.6 : 1} depthWrite={false} toneMapped={false} dithering />
    </mesh>
  );
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
  onGhost: (g: GhostGeom | null) => void;
  onReady?: () => void;
  onSlow?: () => void;
  onFps?: (fps: number) => void;
};

type Shown = { brick: PlacedBrick; leaving: boolean };

export function Scene(props: SceneProps) {
  const { bricks, nextLevel, dark, reducedMotion, settledSignal = 0, onSettled, fontsReady, ao, onGhost, onReady, onSlow, onFps } = props;
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
  const c = dark ? BOARD.dark : BOARD.light;
  const [debug] = useState(() => (typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("bricksDebug") ?? "")));

  return (
    <MotionContext.Provider value={motion}>
      <CameraRig nextLevel={nextLevel} onGhost={onGhost} />
      <Studio dark={dark} floorShadow={!debug.includes("nocontact")} />
      {!debug.includes("nofloor") && <Floor dark={dark} />}
      <Baseplate studs={BASEPLATE} color={c.baseplate} />
      {shown.map(({ brick, leaving: isLeaving }, i) => (
        <StackBrick
          key={brick.id}
          brick={brick}
          drop={!initial.has(brick.id)}
          leaving={isLeaving}
          reducedMotion={reducedMotion}
          bounceSignal={settledSignal}
          index={i}
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
