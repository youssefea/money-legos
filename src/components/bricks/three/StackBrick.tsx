"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PlacedBrick } from "@/lib/contract";
import { DIM } from "../core/dims";
import { jitter, poseFor } from "../core/layout";
import { brickGeometry, frontFace } from "./geometry";
import { labelTexture } from "./labelTexture";
import { plasticMaterial } from "./material";
import { useMotion } from "./motion";

/* Timings in ms. Drop: ~14 mm fall, impact, 6% squash with a tiny rebound, about 300 ms in all. */
const FALL = 150;
const SETTLE = 150;
const DROP_H = 14;
const MOVE = 220;
const MOVE_DELAY = 90;
const LEAVE = 220;
const HOP = 160;
const HOP_SETTLE = 120;

type Anim = { kind: "drop" | "move" | "bounce" | "leave"; t0: number; fromY: number };

let shadowTex: THREE.Texture | null = null;
/** Soft rounded-rectangle shadow used under a dropping brick (the "thud" shadow). */
function blobTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.filter = "blur(14px)";
  g.fillStyle = "#000";
  g.fillRect(28, 28, 72, 72);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

export type StackBrickProps = {
  brick: PlacedBrick;
  /** Drop in on mount (false = appear in place). */
  drop: boolean;
  leaving: boolean;
  reducedMotion: boolean;
  /** Changes trigger the "Generate" settle hop. */
  bounceSignal: number;
  /** Stack index (0 = bottom), staggers the hop by 60 ms. */
  index: number;
  fontsReady: boolean;
  onSettled?: (id: string) => void;
  onLeft?: (id: string) => void;
};

export function StackBrick({ brick, drop, leaving, reducedMotion, bounceSignal, index, fontsReady, onSettled, onLeft }: StackBrickProps) {
  const [w, d] = brick.size;
  const plates = brick.kind === "plate" ? 1 : 3;
  const geometry = useMemo(() => brickGeometry({ w, d, plates }), [w, d, plates]);
  const seed = jitter(brick.id, 9);
  const material = useMemo(() => plasticMaterial(brick.color, "gloss", seed, plates * DIM.plate, false, [w, d]), [brick.color, seed, plates, w, d]);
  useEffect(() => () => material.dispose(), [material]);

  const face = frontFace(w, plates);
  const D = d * DIM.pitch - DIM.gap;
  const verb = brick.label.verb;
  const name = brick.label.name;
  const ink = brick.labelColor;
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const labelMat = useMemo(() => {
    if (!fontsReady) return null;
    // Pad print: a thin ink film, a touch less glossy than the ABS under it.
    return new THREE.MeshPhysicalMaterial({
      map: labelTexture(verb, name, ink, face.width, face.height, Math.min(16, maxAniso)),
      transparent: true,
      roughness: 0.3,
      clearcoat: 0.45,
      clearcoatRoughness: 0.14,
      ior: 1.53,
      specularIntensity: 0.6,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }, [fontsReady, verb, name, ink, face.width, face.height, maxAniso]);
  useEffect(() => () => labelMat?.dispose(), [labelMat]);

  const blobMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#0a0b0d", map: blobTexture(), transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
    [],
  );
  useEffect(() => () => blobMat.dispose(), [blobMat]);

  const pose = poseFor(brick);
  const motion = useMotion();
  const invalidate = useThree((s) => s.invalidate);
  const outer = useRef<THREE.Group>(null);
  const squash = useRef<THREE.Group>(null);
  const blob = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Mesh>(null);
  const print = useRef<THREE.Mesh>(null);
  const bodyMat = () => body.current?.material as THREE.MeshPhysicalMaterial | undefined;
  const printMat = () => print.current?.material as THREE.MeshPhysicalMaterial | undefined;
  const anim = useRef<Anim | null>(null);
  const holding = useRef(false);
  const callbacks = useRef({ onSettled, onLeft });
  useEffect(() => {
    callbacks.current = { onSettled, onLeft };
  });
  // Drop decision is taken once, on mount.
  const [dropOnMount] = useState(() => drop && !reducedMotion);

  const begin = (kind: Anim["kind"], fromY: number) => {
    anim.current = { kind, t0: performance.now(), fromY };
    if (!holding.current) {
      holding.current = true;
      motion.start();
    }
    invalidate();
  };
  const finish = () => {
    anim.current = null;
    if (holding.current) {
      holding.current = false;
      motion.end();
    }
    invalidate();
  };

  // Mount: drop in, or report an instant landing for a reduced-motion add.
  useEffect(() => {
    if (dropOnMount) begin("drop", pose.y + DROP_H);
    else if (drop) callbacks.current.onSettled?.(brick.id);
    return () => {
      if (holding.current) {
        holding.current = false;
        motion.end();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  // Level change (a brick below was removed): slide down to the new level.
  const lastY = useRef(pose.y);
  useEffect(() => {
    if (lastY.current === pose.y) return;
    const from = outer.current?.position.y ?? lastY.current;
    lastY.current = pose.y;
    if (reducedMotion || leaving) {
      if (outer.current) outer.current.position.y = pose.y;
      invalidate();
      return;
    }
    if (anim.current?.kind !== "drop") begin("move", from);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pose.y]);

  // Generate: a tiny staggered hop.
  const lastBounce = useRef(bounceSignal);
  useEffect(() => {
    if (lastBounce.current === bounceSignal) return;
    lastBounce.current = bounceSignal;
    if (leaving) return;
    if (reducedMotion) {
      callbacks.current.onSettled?.(brick.id);
      return;
    }
    begin("bounce", pose.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounceSignal]);

  // Removal: lift off and fade; re-added while leaving: drop back in.
  const wasLeaving = useRef(leaving);
  useEffect(() => {
    if (wasLeaving.current === leaving) return;
    wasLeaving.current = leaving;
    const fade = leaving && !reducedMotion;
    const m = bodyMat();
    if (m) {
      m.transparent = fade;
      m.opacity = 1;
      m.needsUpdate = true;
    }
    const lm = printMat();
    if (lm) lm.opacity = 1;
    if (leaving) {
      if (reducedMotion) callbacks.current.onLeft?.(brick.id);
      else begin("leave", outer.current?.position.y ?? pose.y);
    } else if (!reducedMotion) begin("drop", pose.y + DROP_H);
    else {
      if (outer.current) outer.current.position.y = pose.y;
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  useFrame(() => {
    const a = anim.current;
    const g = outer.current;
    const s = squash.current;
    if (!a || !g || !s) return;
    const t = performance.now() - a.t0;
    const y = pose.y;
    const setBlob = (o: number, k: number) => {
      const b = blob.current;
      if (!b) return;
      (b.material as THREE.MeshBasicMaterial).opacity = o;
      b.scale.set(k, k, 1);
    };
    invalidate();
    switch (a.kind) {
      case "drop": {
        if (t < FALL) {
          const k = t / FALL;
          g.position.y = y + DROP_H * (1 - k * k);
          s.scale.set(1, 1 + 0.02 * k, 1);
          setBlob(0.08 + 0.3 * k * k, 1.35 - 0.35 * k);
          return;
        }
        const tau = (t - FALL) / 1000;
        if (t > FALL + SETTLE) {
          g.position.y = y;
          s.scale.set(1, 1, 1);
          setBlob(0, 1);
          finish();
          callbacks.current.onSettled?.(brick.id);
          return;
        }
        g.position.y = y + 0.35 * Math.exp(-14 * tau) * Math.abs(Math.sin(30 * tau));
        const q = 0.06 * Math.exp(-18 * tau) * Math.cos(32 * tau);
        s.scale.set(1 + q * 0.4, 1 - q, 1 + q * 0.4);
        setBlob(0.38 * (1 - (t - FALL) / SETTLE), 1);
        return;
      }
      case "move": {
        const k = Math.max(0, Math.min(1, (t - MOVE_DELAY) / MOVE));
        const e = 1 - Math.pow(1 - k, 3);
        g.position.y = a.fromY + (y - a.fromY) * e;
        if (t >= MOVE_DELAY + MOVE) finish();
        return;
      }
      case "bounce": {
        const tt = t - index * 60;
        if (tt < 0) return;
        if (tt < HOP) {
          g.position.y = y + 1.6 * Math.sin((Math.PI * tt) / HOP);
          return;
        }
        const tau = (tt - HOP) / 1000;
        if (tt > HOP + HOP_SETTLE) {
          g.position.y = y;
          s.scale.set(1, 1, 1);
          finish();
          callbacks.current.onSettled?.(brick.id);
          return;
        }
        g.position.y = y;
        const q = 0.06 * Math.exp(-20 * tau) * Math.cos(34 * tau);
        s.scale.set(1 + q * 0.4, 1 - q, 1 + q * 0.4);
        return;
      }
      case "leave": {
        // Lift a little, shrink a touch and fade (bricks above wait, then slide down into the gap).
        const k = Math.min(1, t / LEAVE);
        g.position.y = a.fromY + 3 * k * k;
        s.scale.setScalar(1 - 0.05 * k);
        const m = bodyMat();
        if (m) m.opacity = 1 - k;
        const lm = printMat();
        if (lm) lm.opacity = 1 - k;
        if (k >= 1) {
          g.visible = false;
          finish();
          callbacks.current.onLeft?.(brick.id);
        }
        return;
      }
    }
  });

  const startY = dropOnMount ? pose.y + DROP_H : pose.y;
  return (
    <group>
      <group ref={outer} position={[pose.x, startY, pose.z]} rotation={[0, pose.yaw, 0]}>
        <group ref={squash}>
          <mesh ref={body} geometry={geometry} material={material} castShadow receiveShadow />
          {labelMat && (
            <mesh ref={print} position={[0, face.H / 2, D / 2 + 0.012]} material={labelMat} renderOrder={1}>
              <planeGeometry args={[face.width, face.height]} />
            </mesh>
          )}
        </group>
      </group>
      <mesh
        ref={blob}
        position={[pose.x, pose.y - (brick.level > 0 ? DIM.stackGap : 0) + 0.03, pose.z]}
        rotation={[-Math.PI / 2, 0, pose.yaw]}
        material={blobMat}
        renderOrder={2}
      >
        <planeGeometry args={[w * DIM.pitch * 1.25, d * DIM.pitch * 1.25]} />
      </mesh>
    </group>
  );
}
