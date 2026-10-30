import * as THREE from "three";

export type PlasticFinish = "gloss" | "baseplate";

/*
 * Glossy ABS. The base colour is the exact brand hex (three converts it from sRGB); lighting shades it.
 * A small shader patch adds what a flat PBR material lacks:
 *  - roughness micro-variation (soft, low-frequency "orange peel" in object space, no sparkle),
 *  - per-brick roughness offset from a seed, so two bricks never mirror light identically,
 *  - faint moulding wear on the outer fillets only (slightly rougher, a hint of stress whitening).
 */

const NOISE = /* glsl */ `
varying float vWear;
varying vec3 vObj;
uniform float uSeed;
uniform float uWear;
float mlHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mlNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mlHash(i), mlHash(i + vec3(1,0,0)), f.x), mix(mlHash(i + vec3(0,1,0)), mlHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(mlHash(i + vec3(0,0,1)), mlHash(i + vec3(1,0,1)), f.x), mix(mlHash(i + vec3(0,1,1)), mlHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

function patch(m: THREE.MeshPhysicalMaterial, seed: number, wear: number) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSeed = { value: seed };
    shader.uniforms.uWear = { value: wear };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float wear;\nvarying float vWear;\nvarying vec3 vObj;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vWear = wear;
vec4 mlPos = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
mlPos = instanceMatrix * mlPos;
#endif
vObj = mlPos.xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + NOISE)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float mlW = vWear * uWear * (0.55 + 0.45 * mlNoise(vObj * 1.7 + uSeed * 13.0));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), mlW * 0.035);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
float mlN = mlNoise(vObj * 0.45 + uSeed * 7.0) * 0.65 + mlNoise(vObj * 1.6 + uSeed * 3.0) * 0.35;
roughnessFactor = clamp(roughnessFactor * (0.86 + 0.28 * mlN) + mlW * 0.22, 0.04, 1.0);`,
      );
  };
  m.customProgramCacheKey = () => "money-legos-abs";
}

/** A fresh material per brick (it can fade on removal). Dispose it when the brick unmounts. */
export function plasticMaterial(color: string, finish: PlasticFinish = "gloss", seed = 0) {
  const c = new THREE.Color(color);
  const m = new THREE.MeshPhysicalMaterial(
    finish === "gloss"
      ? {
          color: c,
          roughness: 0.15 + seed * 0.025,
          metalness: 0,
          clearcoat: 0.5,
          clearcoatRoughness: 0.09,
          ior: 1.53,
          specularIntensity: 0.65,
        }
      : { color: c, roughness: 0.4, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.35, ior: 1.53, specularIntensity: 0.45 },
  );
  patch(m, seed, finish === "gloss" ? 1 : 0.6);
  return m;
}
