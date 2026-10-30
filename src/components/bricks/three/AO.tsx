"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { N8AOPass } from "n8ao";
import { useMotion } from "./motion";

const FADE_MS = 350;

/**
 * Screen-space ambient occlusion (N8AO) on three's own composer: the contact darkening at stud roots
 * and brick joints that makes bricks sit instead of float. It only runs on still frames (it costs
 * about 3x a plain frame) and fades in over 350 ms after the last brick settles. High sample counts
 * and a wide denoise keep it smooth on stud sides; since it renders once per settle, that is cheap.
 */
export function AO({ intensity = 3.2, radius = 3.2 }: { intensity?: number; radius?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const motion = useMotion();

  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.renderTarget1.samples = 4;
    c.renderTarget2.samples = 4;
    const ao = new N8AOPass(scene, camera, 1, 1);
    ao.beautyRenderTarget.samples = 4; // MSAA: the composer bypasses the canvas antialias
    Object.assign(ao.configuration, {
      aoRadius: radius,
      distanceFalloff: 0.8,
      intensity,
      halfRes: false,
      aoSamples: 32,
      denoiseSamples: 16,
      denoiseRadius: 8,
      denoiseIterations: 3,
      screenSpaceRadius: false,
      gammaCorrection: false, // OutputPass does tone mapping and sRGB
    });
    c.addPass(ao);
    c.addPass(new OutputPass());
    return { c, ao };
  }, [gl, scene, camera, radius, intensity]);

  useEffect(() => {
    composer.c.setPixelRatio(gl.getPixelRatio());
    composer.c.setSize(size.width, size.height);
    invalidate();
  }, [composer, gl, size, invalidate]);
  useEffect(() => () => composer.c.dispose(), [composer]);
  const live = useRef(composer);
  useEffect(() => {
    live.current = composer;
  }, [composer]);

  useFrame(() => {
    if (motion.busy) {
      gl.render(scene, camera);
      return;
    }
    const k = motion.lastEnd === 0 ? 1 : Math.min(1, (performance.now() - motion.lastEnd) / FADE_MS);
    if (k < 1) invalidate();
    live.current.ao.configuration.intensity = intensity * k;
    live.current.c.render();
  }, 1);
  return null;
}
