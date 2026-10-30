"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DIM } from "../core/dims";
import { brickGeometry, studGeometry } from "./geometry";
import { plasticMaterial } from "./material";

/** Height of the inset foot under the slab (mm): the underside lip that lifts the plate off the table. */
export const PLATE_FOOT = 0.6;

/**
 * Studded baseplate: one slab, one InstancedMesh for all studs, and a slightly inset foot under the
 * slab (the moulded underside lip): its shadow line keeps the plate's lower edge readable on any page.
 */
export function Baseplate({ studs, color, dark = false }: { studs: [number, number]; color: string; dark?: boolean }) {
  const [w, d] = studs;
  const slab = useMemo(() => brickGeometry({ w, d, plates: 1, studs: false, hollow: false }), [w, d]);
  const stud = useMemo(() => {
    const g = studGeometry(40);
    g.setAttribute("wear", new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count), 1));
    return g;
  }, []);
  const foot = useMemo(() => {
    const inset = 0.7;
    const g = new THREE.BoxGeometry(w * DIM.pitch - DIM.gap - 2 * inset, PLATE_FOOT, d * DIM.pitch - DIM.gap - 2 * inset);
    g.translate(0, -PLATE_FOOT / 2, 0);
    g.setAttribute("wear", new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count), 1));
    return g;
  }, [w, d]);
  useEffect(() => () => foot.dispose(), [foot]);
  const mat = useMemo(() => plasticMaterial(color, "baseplate", 0.3, DIM.plate, dark), [color, dark]);
  const footMat = useMemo(() => {
    const m = plasticMaterial(color, "baseplate", 0.5, 0, dark);
    m.color.multiplyScalar(0.55);
    return m;
  }, [color, dark]);
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => () => footMat.dispose(), [footMat]);
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
      <mesh geometry={foot} material={footMat} receiveShadow />
      <instancedMesh ref={inst} args={[stud, mat, w * d]} castShadow receiveShadow />
    </group>
  );
}
