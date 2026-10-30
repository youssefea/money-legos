"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { BrickStageProps } from "@/lib/contract";
import { GhostMarker } from "../core/GhostMarker";
import type { GhostGeom, GhostRect } from "../core/ghost";
import { loadLabelFonts } from "../core/label";
import { FOV, type Framing } from "../core/layout";
import { Scene, type BoardFrame } from "./Scene";

export type Stage3DProps = Omit<BrickStageProps, "className"> & {
  onReady?: () => void;
  onSlow?: () => void;
  onFps?: (fps: number) => void;
  /** Screen-space AO on still frames (default on). */
  ao?: boolean;
  framing?: Framing;
  /** Where the ghost slot is, in canvas px (null when the stack is full). */
  onGhostRect?: (rect: GhostRect | null) => void;
  /** The board's framing readout (stack/ghost top as a fraction of the height, plate width in px). */
  onFrame?: (f: BoardFrame) => void;
};

const fill = { position: "absolute", inset: 0, width: "100%", height: "100%" } as const;

/** The live board: one R3F canvas (renders on demand) plus an SVG overlay for the ghost slot. */
export default function Stage3D({ ao = true, onReady, onSlow, onFps, onGhostRect, onFrame, onLayout, framing, ...props }: Stage3DProps) {
  const [ghost, setGhostState] = useState<GhostGeom | null>(null);
  const rectCb = useRef(onGhostRect);
  useEffect(() => {
    rectCb.current = onGhostRect;
  });
  const setGhost = useCallback((g: GhostGeom | null) => {
    setGhostState(g);
    rectCb.current?.(g && { slot: g.slot, ...g.bounds });
  }, []);
  // The ghost overlay follows a camera pan with a transform: no React render per frame.
  const overlay = useRef<SVGSVGElement>(null);
  const onPan = useCallback((dx: number, dy: number) => {
    const el = overlay.current;
    if (el) el.style.transform = dx === 0 && dy === 0 ? "" : `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
  }, []);
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
        <Scene {...props} fontsReady={fontsReady} ao={ao} framing={framing} onGhost={setGhost} onReady={onReady} onSlow={onSlow} onFps={onFps} onFrame={onFrame} onPan={onPan} onLayout={onLayout} />
      </Canvas>
      {ghost && (
        <svg ref={overlay} style={{ ...fill, overflow: "visible", pointerEvents: "none" }}>
          <GhostMarker ghost={ghost} dark={props.dark} still={props.reducedMotion} />
        </svg>
      )}
    </div>
  );
}
