"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { PLATE_FOOT } from "./Baseplate";

// Rect area lights need their LTC lookup tables registered once (pure data, no GPU work).
RectAreaLightUniformsLib.init();

/**
 * A near-field softbox (three's RectAreaLight, world units = mm). Unlike the environment map it sits
 * close to the bricks, so a flat glossy face mirrors a gradient across it, the way a real studio
 * light reads on moulded plastic.
 */
function Softbox({ position, size, intensity, color = "#ffffff", target = [0, 14, 0] }: { position: [number, number, number]; size: [number, number]; intensity: number; color?: string; target?: [number, number, number] }) {
  const ref = useRef<THREE.RectAreaLight>(null);
  const [tx, ty, tz] = target;
  useLayoutEffect(() => {
    ref.current?.lookAt(tx, ty, tz);
  }, [tx, ty, tz]);
  return <rectAreaLight ref={ref} position={position} width={size[0]} height={size[1]} intensity={intensity} color={color} />;
}

const T_LOW: [number, number, number] = [0, 6, 0];

/**
 * Product-photo studio, generated on the GPU (no HDR download):
 *  - an environment with a bright overhead, big diffused softboxes and thin strip lights: the broad
 *    sheen on top faces and the crisp, thin highlight along every filleted edge and stud rim;
 *  - near-field softboxes (rect area lights) for the soft gradients across flat glossy faces;
 *  - a raised ambient fill so side faces stay colourful instead of muddy;
 *  - one soft shadow-casting key, and a soft contact shadow under the baseplate.
 * `floorY` moves the contact shadow (sprite bakes put it under the lone brick instead of the plate).
 */
export function Studio({ dark = false, floorShadow = true, floorY = -PLATE_FOOT - 0.02, shadowSize = 2048 }: { dark?: boolean; floorShadow?: boolean; floorY?: number; shadowSize?: number }) {
  return (
    <>
      <Environment resolution={512} frames={1} background={false}>
        {/* soft studio grey all round: dark enough for contrast, light enough that sides never go muddy */}
        <color attach="background" args={[dark ? "#24262b" : "#3a3d44"]} />
        {/* white sweep in front and below: lifts the lower half of front faces */}
        <Lightformer form="rect" intensity={dark ? 0.25 : 0.3} color="#ffffff" position={[0, -3, 7]} rotation-x={-Math.PI / 3} scale={[20, 6, 1]} />
        {/* big overhead softbox: bright top hemisphere, the sheen on every top face */}
        <Lightformer form="rect" intensity={1.8} position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
        {/* diffused softbox above and behind (what the top faces mirror at this camera) */}
        <Lightformer form="rect" intensity={1.5} position={[-3.5, 4.2, -8]} scale={[14, 5, 1]} target={[0, 0, 0]} />
        {/* thin, very bright strips: tiny solid angle (little extra fill) but crisp white lines where a
            fillet or stud rim turns towards them, the signature highlight of moulded ABS */}
        <Lightformer form="rect" intensity={dark ? 9 : 12} position={[0, 7.2, 3.4]} scale={[16, 1.1, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={dark ? 8 : 11} position={[-7, 2.5, 3]} scale={[0.9, 8, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={dark ? 7 : 10} position={[6.5, 3.5, 4.5]} scale={[0.3, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={dark ? 2.2 : 3.2} position={[2, 6.5, -6]} scale={[10, 0.5, 1]} target={[0, 0, 0]} />
        {/* soft fill at the right: side faces mirror a gentle light instead of black */}
        <Lightformer form="rect" intensity={dark ? 1.1 : 1.5} position={[8, 1.5, -3]} scale={[5, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.6} position={[6, 3, 6]} scale={[6, 5, 1]} target={[0, 0, 0]} />
      </Environment>
      {/* near-field softboxes (mm): key above-left-front, a warm-neutral card front-left, a cool strip right */}
      <Softbox position={[-40, 115, 30]} size={[100, 80]} intensity={dark ? 2.6 : 3} />
      <Softbox position={[-30, 4, 85]} size={[110, 28]} intensity={dark ? 0.45 : 0.5} target={T_LOW} />
      <Softbox position={[85, 26, -10]} size={[24, 70]} intensity={dark ? 1.4 : 1.7} target={T_LOW} />
      <hemisphereLight intensity={dark ? 0.42 : 0.42} color="#ffffff" groundColor={dark ? "#8a8e98" : "#9a9ea8"} />
      <directionalLight
        castShadow
        intensity={dark ? 2.2 : 2.2}
        position={[-45, 170, 55]}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.03}
        shadow-radius={22}
        shadow-blurSamples={24}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={80}
        shadow-camera-far={260}
      />
      {floorShadow && (
        <ContactShadows position={[0, floorY, 0]} scale={150} far={24} blur={3} opacity={dark ? 0.85 : 0.6} resolution={1024} frames={1} color="#0a0b0d" />
      )}
    </>
  );
}
