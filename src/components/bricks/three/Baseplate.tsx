"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DIM } from "../core/dims";
import { brickGeometry, studGeometry } from "./geometry";
import { plasticMaterial } from "./material";

/** Studded baseplate: one slab and one InstancedMesh for all studs (two draw calls). */
export function Baseplate({ studs, color }: { studs: [number, number]; color: string }) {
  const [w, d] = studs;
  const slab = useMemo(() => brickGeometry({ w, d, plates: 1, studs: false, hollow: false }), [w, d]);
  const stud = useMemo(() => {
    const g = studGeometry(40);
    g.setAttribute("wear", new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count), 1));
    return g;
  }, []);
  const mat = useMemo(() => plasticMaterial(color, "baseplate", 0.3), [color]);
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => () => stud.dispose(), [stud]);
  const inst = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = inst.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    let n = 0;
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        m.makeTranslation((i + 0.5) * DIM.pitch - (w * DIM.pitch) / 2, DIM.plate, (j + 0.5) * DIM.pitch - (d * DIM.pitch) / 2);
        mesh.setMatrixAt(n++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [w, d]);
  return (
    <group>
      <mesh geometry={slab} material={mat} receiveShadow castShadow />
      <instancedMesh ref={inst} args={[stud, mat, w * d]} castShadow receiveShadow />
    </group>
  );
}
