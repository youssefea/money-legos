import { describe, expect, it } from "vitest";
import { LEGOS } from "@/lib/legos";
import { toPlacedBricks } from "@/lib/bricks";
import { brickGeometry, frontFace } from "../three/geometry";
import { EXTENTS, project, svgViewBox } from "../svg/projector";
import { DIM, studCenters } from "./dims";
import { ghostGeom } from "./ghost";
import { approxMeasure, layoutLabel, VERB_TRACKING } from "./label";
import { CAMERA, DEFAULT_FRAMING, VIEW, poseFor } from "./layout";

/** Stud tips: the lathe apex of every stud sits on its axis at the top of the brick. */
function studTips(w: number, d: number) {
  const H = DIM.plate * 3;
  const g = brickGeometry({ w, d, plates: 3 });
  const pos = g.attributes.position!;
  const tips = new Set<string>();
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(pos.getY(i) - (H + DIM.studH)) > 1e-3) continue;
    // apex vertices only (radius ~0 from a stud axis)
    const x = pos.getX(i), z = pos.getZ(i);
    const near = studCenters(w, d).find(([cx, cz]) => Math.hypot(x - cx, z - cz) < 0.01);
    if (near) tips.add(near.join(","));
  }
  return tips.size;
}

describe("brick geometry", () => {
  it("has exactly 8 studs on a 2x4 and 4 on a 2x2", () => {
    expect(studCenters(4, 2)).toHaveLength(8);
    expect(studCenters(2, 2)).toHaveLength(4);
    expect(new Set(studCenters(4, 2).map((c) => c.join(","))).size).toBe(8);
    expect(studTips(4, 2)).toBe(8);
    expect(studTips(2, 2)).toBe(4);
  });

  it("keeps every stud inside the footprint on the 8 mm grid", () => {
    for (const [x, z] of studCenters(4, 2)) {
      expect(Math.abs(x)).toBeLessThanOrEqual(2 * DIM.pitch - DIM.studR);
      expect(Math.abs(z)).toBeLessThanOrEqual(DIM.pitch - DIM.studR);
      expect(((x % 8) + 8) % 8).toBeCloseTo(4);
    }
  });
});

describe("camera", () => {
  it("looks down 28° from 32° to the right", () => {
    expect(CAMERA).toEqual({ pitch: 28, azimuth: 32 });
    const [x, y, z] = VIEW;
    expect((Math.asin(y / Math.hypot(x, y, z)) * 180) / Math.PI).toBeCloseTo(28, 5);
    expect((Math.atan2(x, z) * 180) / Math.PI).toBeCloseTo(32, 5);
  });

  it("yaw jitter is deterministic and within ±0.4°", () => {
    for (const b of toPlacedBricks(LEGOS.slice(0, 4).map((l) => l.id))) {
      const yaw = poseFor(b).yaw;
      expect(poseFor(b).yaw).toBe(yaw);
      expect(Math.abs((yaw * 180) / Math.PI)).toBeLessThanOrEqual(0.41);
    }
  });
});

describe("labels", () => {
  it("prints white only on #0000FF, #32353D and #0A0B0D", () => {
    const white = new Set(["#0000FF", "#32353D", "#0A0B0D"]);
    for (const l of LEGOS) expect(l.brick.label.toUpperCase()).toBe(white.has(l.brick.hex.toUpperCase()) ? "#FFFFFF" : "#0A0B0D");
  });

  it("left-aligns verb and name inside the front face", () => {
    for (const l of LEGOS) {
      const face = frontFace(l.size[0], 3);
      const L = layoutLabel(l.kicker, l.title, face.width, face.height, approxMeasure);
      expect(L.x).toBeGreaterThan(1);
      const verbW = approxMeasure(L.verb.text, "verb", L.verb.size) + L.verb.text.length * L.verb.size * VERB_TRACKING;
      expect(L.x + verbW).toBeLessThanOrEqual(face.width - L.x + 0.01);
      for (const line of L.name) expect(L.x + approxMeasure(line.text, "name", line.size)).toBeLessThanOrEqual(face.width - L.x + 0.01);
      expect(L.verb.y - L.verb.size * 0.71).toBeGreaterThan(0.4);
      expect(L.name[L.name.length - 1]!.y).toBeLessThan(face.height - 0.4);
    }
  });
});

describe("board framing", () => {
  const plateW = EXTENTS.plate.x1 - EXTENTS.plate.x0;
  const boxH = EXTENTS.box.y1 - EXTENTS.box.y0;

  it("fills 88% of a desktop board panel with the baseplate", () => {
    const vb = svgViewBox(567, 520);
    expect(plateW * vb.scale).toBeCloseTo(0.88 * 567, 0);
    expect(boxH * vb.scale).toBeLessThanOrEqual(0.94 * 520);
  });

  it("keeps the 4-brick tower inside a phone sticky bar", () => {
    const vb = svgViewBox(340, 130);
    expect(boxH * vb.scale).toBeLessThanOrEqual(DEFAULT_FRAMING.maxH * 130 + 0.01);
    expect(plateW * vb.scale).toBeGreaterThan(120);
  });
});

describe("ghost slot", () => {
  it("is one closed outer silhouette with the slot number", () => {
    const g = ghostGeom(6, project);
    expect(g.slot).toBe(3);
    expect(g.outline.length).toBeGreaterThanOrEqual(4);
    expect(g.outline.length).toBeLessThanOrEqual(6);
    const { x, y, width, height } = g.bounds;
    expect(g.centre[0]).toBeGreaterThan(x);
    expect(g.centre[0]).toBeLessThan(x + width);
    expect(g.centre[1]).toBeGreaterThan(y);
    expect(g.centre[1]).toBeLessThan(y + height);
  });
});
