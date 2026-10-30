"use client";

import "./quietClock";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { PlacedBrick } from "@/lib/contract";
import { DIM } from "../core/dims";
import { loadLabelFonts } from "../core/label";
import { FOV, TRAY_VIEW, poseFor } from "../core/layout";
import { AO } from "./AO";
import { MotionContext, MotionStore } from "./motion";
import { StackBrick } from "./StackBrick";
import { Studio } from "./Studio";

declare global {
  interface Window {
    __bakeReady?: boolean;
    /** Screen x (CSS px of the canvas) of the brick's front-bottom corners, left and right. */
    __bakeFront?: [number, number];
  }
}

/**
 * The tray's hero view (TRAY_VIEW: a step more front-on than the board, so the print reads) through the
 * board's lens. The distance is fitted to a 2x4 brick and its floor
 * shadow and kept for every brick, so 2x2 sprites come out at the same mm-to-px scale as the 2x4s
 * (the baker then crops each one tight).
 */
function FitBrick({ brick }: { brick: PlacedBrick }) {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const camera = get().camera as THREE.PerspectiveCamera;
    const pose = poseFor(brick);
    const H = pose.height + DIM.studH;
    const box = (w: number, d: number) => {
      const W = w * DIM.pitch;
      const D = d * DIM.pitch;
      const pts: THREE.Vector3[] = [];
      for (const x of [-W / 2, W / 2]) for (const y of [0, H]) for (const z of [-D / 2, D / 2]) pts.push(new THREE.Vector3(x, pose.y + y, z));
      // room for the soft shadow at the front-right and below
      pts.push(new THREE.Vector3(W / 2 + 2.5, pose.y, D / 2 + 3.5), new THREE.Vector3(-W / 2 - 1, pose.y, D / 2 + 3.5));
      return pts;
    };
    const ref = box(4, 2);
    const target = new THREE.Vector3(0, pose.y + H / 2, 0);
    const dir = new THREE.Vector3(...TRAY_VIEW).normalize();
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
    let lo = 10, hi = 2000;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      place(mid);
      const over = ref.some((p) => {
        const v = p.clone().project(camera);
        return Math.abs(v.x) > 0.96 || Math.abs(v.y) > 0.96;
      });
      if (over) lo = mid;
      else hi = mid;
    }
    place(hi);
    // Where the front face starts and ends on screen: the baker maps it into the sprite (spriteMeta `front`).
    const Wf = brick.size[0] * DIM.pitch - DIM.gap, Df = brick.size[1] * DIM.pitch - DIM.gap;
    const sx = (x: number) => ((new THREE.Vector3(pose.x + x, pose.y, pose.z + Df / 2).project(camera).x + 1) / 2) * size.width;
    window.__bakeFront = [sx(-Wf / 2), sx(Wf / 2)];
    invalidate();
  }, [get, size, brick, invalidate]);
  return null;
}

/** Flags window.__bakeReady once the label is drawn and AO has had a few still frames. */
function ReadyFlag({ fontsReady }: { fontsReady: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const count = useRef(0);
  useFrame(() => {
    if (!fontsReady) return;
    if (count.current++ < 12) invalidate();
    else window.__bakeReady = true;
  });
  useEffect(() => {
    invalidate();
  }, [fontsReady, invalidate]);
  return null;
}

/**
 * One brick on a transparent background, lit by the board's studio and seen through the board's
 * lens from the tray's hero angle. scripts/bake-sprites screenshots it into public/sprites/<legoId>.webp, or, with `glyph`, an
 * unprinted 2x4 in the Lego's colour into public/sprites/glyph-<legoId>.webp.
 */
export default function SpriteBake({ brick, glyph = false }: { brick: PlacedBrick; glyph?: boolean }) {
  const [motion] = useState(() => new MotionStore());
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let live = true;
    void loadLabelFonts().then(() => {
      if (live) setFontsReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  const pose = poseFor(brick);
  return (
    <Canvas
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", background: "transparent" }}
      shadows="variance"
      frameloop="demand"
      dpr={[1, 3]}
      camera={{ fov: FOV, position: [0, 80, 200] }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1, preserveDrawingBuffer: true }}
    >
      <MotionContext.Provider value={motion}>
        <FitBrick brick={brick} />
        {/* the board's studio and contact shadow, moved up under the lone brick */}
        <Studio floorShadow floorY={pose.y - 0.02} />
        {/* a glyph is too small for print: never draw the label */}
        <StackBrick brick={brick} drop={false} leaving={false} reducedMotion bounceSignal={0} index={0} fontsReady={fontsReady && !glyph} />
        {/* shadow catcher: the key light's soft cast shadow, as the plate receives it on the board */}
        <mesh rotation-x={-Math.PI / 2} position={[0, pose.y - 0.01, 0]} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <shadowMaterial transparent opacity={0.32} color="#0a0b0d" depthWrite={false} />
        </mesh>
        {/* tight contact blob: the dark line where the brick meets the table, so it sits instead of floating */}
        <ContactShadows position={[0, pose.y - 0.03, 0]} scale={60} far={4} blur={1.6} opacity={0.35} resolution={1024} frames={1} color="#0a0b0d" />
        <AO />
        <ReadyFlag fontsReady={fontsReady} />
      </MotionContext.Provider>
    </Canvas>
  );
}
