"use client";

import { ContactShadows, Environment, Lightformer } from "@react-three/drei";

/**
 * Soft product-photo studio, generated on the GPU (no HDR download): a few large, soft light panels
 * that glossy faces mirror towards the camera, a broad white "tabletop bounce" in front, one soft
 * shadow-casting key light, and a contact shadow on the floor under the baseplate.
 * `floorShadow` is off for sprite bakes that draw their own.
 */
export function Studio({ dark = false, floorShadow = true, shadowSize = 2048 }: { dark?: boolean; floorShadow?: boolean; shadowSize?: number }) {
  return (
    <>
      <Environment resolution={256} frames={1} background={false}>
        <color attach="background" args={[dark ? "#141519" : "#2c2f35"]} />
        {/* white table bounce in front: lifts the lower half of front faces like a sweep does */}
        <Lightformer form="rect" intensity={dark ? 0.9 : 1.3} color="#ffffff" position={[0, -3, 7]} rotation-x={-Math.PI / 3} scale={[20, 6, 1]} />
        {/* big diffused softbox above and behind: the broad sheen on every top face */}
        <Lightformer form="rect" intensity={3.0} position={[-3.5, 4.2, -8]} scale={[13, 5, 1]} target={[0, 0, 0]} />
        {/* overhead panel */}
        <Lightformer form="rect" intensity={1.4} position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[9, 9, 1]} />
        {/* tall strip at the left: the vertical glint on studs and left edges */}
        <Lightformer form="rect" intensity={4.5} position={[-7, 2.5, 3]} scale={[1.4, 8, 1]} target={[0, 0, 0]} />
        {/* soft fill box at the right front, mirrored by front faces as a gentle gradient */}
        <Lightformer form="rect" intensity={1.25} position={[6, 3, 6]} scale={[6, 5, 1]} target={[0, 0, 0]} />
      </Environment>
      <hemisphereLight intensity={dark ? 0.22 : 0.3} color="#ffffff" groundColor="#7d8088" />
      <directionalLight
        castShadow
        intensity={dark ? 2.3 : 2.5}
        position={[-55, 150, 85]}
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
        <ContactShadows position={[0, -0.02, 0]} scale={150} far={30} blur={2.6} opacity={dark ? 0.85 : 0.5} resolution={512} frames={1} color="#0a0b0d" />
      )}
    </>
  );
}
