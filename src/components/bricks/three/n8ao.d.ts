declare module "n8ao" {
  import type { Camera, Scene, WebGLRenderTarget } from "three";
  import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
  export class N8AOPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: Record<string, number | boolean | string | object>;
    beautyRenderTarget: WebGLRenderTarget;
    setQualityMode(mode: string): void;
    setSize(width: number, height: number): void;
  }
}
