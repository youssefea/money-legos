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
uniform float uPeel;
float mlHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mlNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mlHash(i), mlHash(i + vec3(1,0,0)), f.x), mix(mlHash(i + vec3(0,1,0)), mlHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(mlHash(i + vec3(0,0,1)), mlHash(i + vec3(1,0,1)), f.x), mix(mlHash(i + vec3(0,1,1)), mlHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

type Patch = { seed: number; wear: number; top: number; seam: number; rim: number; peel: number };

function patch(m: THREE.MeshPhysicalMaterial, { seed, wear, top, seam, rim, peel }: Patch) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSeed = { value: seed };
    shader.uniforms.uWear = { value: wear };
    shader.uniforms.uTop = { value: top };
    shader.uniforms.uSeam = { value: seam };
    shader.uniforms.uRim = { value: rim };
    shader.uniforms.uPeel = { value: peel };
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
// Walls get a little less sky near their foot (the brick or plate below shades them): a soft
// vertical gradient on every wall, brighter towards the top edge, like a studio photo.
float mlWall = 1.0 - abs((vec4(normalize(vNormal), 0.0) * viewMatrix).y);
float mlGrad = uTop > 0.0 ? mix(1.0, 0.86 + 0.2 * smoothstep(0.0, uTop, vObj.y), mlWall * step(vObj.y, uTop)) : 1.0;
diffuseColor.rgb *= mlAO * mlGrad * (1.0 - 0.72 * mlSeam);`,
      )
      .replace(
        "#include <clearcoat_normal_fragment_maps>",
        `#include <clearcoat_normal_fragment_maps>
// Moulding texture, in object space (mm): a faint low-amplitude "orange peel" ripple, plus a shallow
// sink mark in the middle of each stud top (no logo). Both tilt the shading normal a hair, so the
// reflections waver slightly as on real ABS instead of looking like a perfect mirror.
vec3 mlP = vObj * 1.35 + uSeed * 5.0;
float mlE = 0.18;
float mlN0 = mlNoise(mlP);
vec3 mlG = vec3(mlNoise(mlP + vec3(mlE, 0.0, 0.0)) - mlN0, mlNoise(mlP + vec3(0.0, mlE, 0.0)) - mlN0, mlNoise(mlP + vec3(0.0, 0.0, mlE)) - mlN0) / mlE;
vec3 mlTilt = mlG * uPeel;
if (uTop > 0.0) {
  vec2 mlS = mod(vObj.xz, 8.0) - 4.0;
  float mlSR = length(mlS);
  if (vObj.y > uTop + 1.68 && mlSR < 1.9) {
    // concave dimple ~1.6 mm across: the normal leans towards the stud axis
    float mlK = 0.07 * sin(clamp(mlSR / 1.6, 0.0, 1.0) * 3.14159);
    mlTilt += vec3(-mlS.x, 0.0, -mlS.y) / max(mlSR, 1e-3) * mlK;
  }
}
vec3 mlTv = mat3(viewMatrix) * mlTilt;
normal = normalize(normal + mlTv - normal * dot(mlTv, normal));
#ifdef USE_CLEARCOAT
clearcoatNormal = normalize(clearcoatNormal + mlTv - clearcoatNormal * dot(mlTv, clearcoatNormal));
#endif`,
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
export function plasticMaterial(color: string, finish: PlasticFinish = "gloss", seed = 0, top = 0, dark = false) {
  const c = new THREE.Color(color);
  const m = new THREE.MeshPhysicalMaterial(
    finish === "gloss"
      ? {
          color: c,
          roughness: 0.18 + seed * 0.02,
          metalness: 0,
          clearcoat: 0.9,
          clearcoatRoughness: 0.07,
          ior: 1.53,
          specularIntensity: 0.65,
        }
      : { color: c, roughness: 0.4, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.35, ior: 1.53, specularIntensity: 0.45 },
  );
  const gloss = finish === "gloss";
  // Dark mode: the plate's stud rims mirror the strip lights; a quarter less keeps them plastic, not metal.
  if (!gloss) m.envMapIntensity = dark ? 0.6 : 0.62;
  patch(m, { seed, wear: gloss ? 1 : 0.6, top, seam: gloss ? 1 : 0, rim: (gloss ? 0.1 : 0.05) * (dark ? 0.75 : 1), peel: gloss ? 0.022 : 0.03 });
  return m;
}
