"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { BrickStageProps } from "@/lib/contract";
import { GhostMarker } from "../core/GhostMarker";
import type { GhostGeom } from "../core/ghost";
import { loadLabelFonts } from "../core/label";
import { FOV } from "../core/layout";
import { Scene } from "./Scene";

export type Stage3DProps = Omit<BrickStageProps, "className"> & {
  onReady?: () => void;
  onSlow?: () => void;
  onFps?: (fps: number) => void;
  /** Screen-space AO on still frames (default on). */
  ao?: boolean;
};

const fill = { position: "absolute", inset: 0, width: "100%", height: "100%" } as const;

/** The live board: one R3F canvas (renders on demand) plus an SVG overlay for the ghost slot. */
export default function Stage3D({ ao = true, onReady, onSlow, onFps, ...props }: Stage3DProps) {
  const [ghost, setGhost] = useState<GhostGeom | null>(null);
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

  return (
    <div style={fill} aria-hidden>
      <Canvas
        style={{ ...fill, pointerEvents: "none" }}
        shadows="variance"
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: FOV, position: [0, 80, 200] }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1, powerPreference: "high-performance" }}
      >
        <Scene {...props} fontsReady={fontsReady} ao={ao} onGhost={setGhost} onReady={onReady} onSlow={onSlow} onFps={onFps} />
      </Canvas>
      {ghost && (
        <svg style={{ ...fill, overflow: "visible", pointerEvents: "none" }}>
          <GhostMarker ghost={ghost} dark={props.dark} still={props.reducedMotion} />
        </svg>
      )}
    </div>
  );
}
