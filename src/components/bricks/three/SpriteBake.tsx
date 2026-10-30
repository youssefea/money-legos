"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { PlacedBrick } from "@/lib/contract";
import { DIM } from "../core/dims";
import { loadLabelFonts } from "../core/label";
import { FOV, VIEW, poseFor } from "../core/layout";
import { AO } from "./AO";
import { MotionContext, MotionStore } from "./motion";
import { StackBrick } from "./StackBrick";
import { Studio } from "./Studio";

declare global {
  interface Window {
    __bakeReady?: boolean;
  }
}

/** Same camera direction and lens as the board, fitted to one brick and its floor shadow. */
function FitBrick({ brick }: { brick: PlacedBrick }) {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const camera = get().camera as THREE.PerspectiveCamera;
    const pose = poseFor(brick);
    const W = brick.size[0] * DIM.pitch;
    const D = brick.size[1] * DIM.pitch;
    const H = pose.height + DIM.studH;
    const pts: THREE.Vector3[] = [];
    for (const x of [-W / 2, W / 2]) for (const y of [0, H]) for (const z of [-D / 2, D / 2]) pts.push(new THREE.Vector3(x, pose.y + y, z));
    // room for the soft shadow at the front-right and below
    pts.push(new THREE.Vector3(W / 2 + 2.5, pose.y, D / 2 + 3.5), new THREE.Vector3(-W / 2 - 1, pose.y, D / 2 + 3.5));
    const target = new THREE.Vector3(0, pose.y + H / 2, 0);
    const dir = new THREE.Vector3(...VIEW).normalize();
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
      const over = pts.some((p) => {
        const v = p.clone().project(camera);
        return Math.abs(v.x) > 0.94 || Math.abs(v.y) > 0.94;
      });
      if (over) lo = mid;
      else hi = mid;
    }
    place(hi);
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
 * lens. scripts/bake-sprites screenshots it into public/sprites/<legoId>.webp.
 */
export default function SpriteBake({ brick }: { brick: PlacedBrick }) {
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
        <Studio floorShadow={false} />
        <StackBrick brick={brick} drop={false} leaving={false} reducedMotion bounceSignal={0} index={0} fontsReady={fontsReady} />
        <ContactShadows position={[0, pose.y - 0.02, 0]} scale={80} far={14} blur={2.2} opacity={0.42} resolution={512} frames={1} color="#0a0b0d" />
        <AO />
        <ReadyFlag fontsReady={fontsReady} />
      </MotionContext.Provider>
    </Canvas>
  );
}
