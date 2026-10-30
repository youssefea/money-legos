import * as THREE from "three";

export type PlasticFinish = "gloss" | "baseplate";

/*
 * Glossy ABS. The base colour is the exact brand hex (three converts it from sRGB); lighting shades it.
 * A small shader patch adds what a flat PBR material lacks:
 *  - roughness micro-variation (soft, low-frequency "orange peel" in object space, no sparkle),
 *  - per-brick roughness offset from a seed, so two bricks never mirror light identically,
 *  - faint moulding wear on the outer fillets only (slightly rougher, a hint of stress whitening),
 *  - baked occlusion in the corner where each stud meets the top face (`top` = that face's height),
 *  - a dark recess line along the bottom 0.3 mm of the walls: the seam to the brick (or plate) below,
 *  - a restrained Fresnel rim on the bevels, the bright edge line of real moulded plastic.
 */

const NOISE = /* glsl */ `
varying float vWear;
varying vec3 vObj;
uniform float uSeed;
uniform float uWear;
uniform float uTop;
uniform float uSeam;
uniform float uRim;
float mlHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mlNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mlHash(i), mlHash(i + vec3(1,0,0)), f.x), mix(mlHash(i + vec3(0,1,0)), mlHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(mlHash(i + vec3(0,0,1)), mlHash(i + vec3(1,0,1)), f.x), mix(mlHash(i + vec3(0,1,1)), mlHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

type Patch = { seed: number; wear: number; top: number; seam: number; rim: number };

function patch(m: THREE.MeshPhysicalMaterial, { seed, wear, top, seam, rim }: Patch) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSeed = { value: seed };
    shader.uniforms.uWear = { value: wear };
    shader.uniforms.uTop = { value: top };
    shader.uniforms.uSeam = { value: seam };
    shader.uniforms.uRim = { value: rim };
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
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), mlW * 0.035);
float mlAO = 1.0;
if (uTop > 0.0) {
  // studs sit on an 8 mm grid with centres at 4 mm offsets (every piece here is an even number of studs wide)
  vec2 mlQ = mod(vObj.xz, 8.0) - 4.0;
  float mlR = length(mlQ);
  float mlH = vObj.y - uTop;
  if (mlH > -0.05 && mlH < 1.0) mlAO -= 0.36 * (1.0 - smoothstep(2.32, 3.7, mlR)) * (1.0 - smoothstep(0.0, 1.0, max(mlH, 0.0)));
}
float mlSeam = uSeam * (1.0 - smoothstep(0.02, 0.34, vObj.y));
diffuseColor.rgb *= mlAO * (1.0 - 0.72 * mlSeam);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
float mlN = mlNoise(vObj * 0.45 + uSeed * 7.0) * 0.65 + mlNoise(vObj * 1.6 + uSeed * 3.0) * 0.35;
roughnessFactor = clamp(roughnessFactor * (0.86 + 0.28 * mlN) + mlW * 0.22, 0.04, 1.0);`,
      )
      .replace(
        "#include <opaque_fragment>",
        `float mlF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 4.0);
outgoingLight += vec3(uRim * mlF * mlAO * (1.0 - mlSeam));
#include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => "money-legos-abs";
}

/**
 * A fresh material per brick (it can fade on removal). Dispose it when the brick unmounts.
 * `top` = height of the face the studs stand on (mm, object space), for the stud-root occlusion.
 */
export function plasticMaterial(color: string, finish: PlasticFinish = "gloss", seed = 0, top = 0) {
  const c = new THREE.Color(color);
  const m = new THREE.MeshPhysicalMaterial(
    finish === "gloss"
      ? {
          color: c,
          roughness: 0.18 + seed * 0.02,
          metalness: 0,
          clearcoat: 0.6,
          clearcoatRoughness: 0.12,
          ior: 1.53,
          specularIntensity: 0.65,
        }
      : { color: c, roughness: 0.4, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.35, ior: 1.53, specularIntensity: 0.45 },
  );
  const gloss = finish === "gloss";
  patch(m, { seed, wear: gloss ? 1 : 0.6, top, seam: gloss ? 1 : 0, rim: gloss ? 0.1 : 0.05 });
  return m;
}
