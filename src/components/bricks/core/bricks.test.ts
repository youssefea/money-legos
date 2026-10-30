import { describe, expect, it } from "vitest";
import { LEGOS } from "@/lib/legos";
import { toPlacedBricks } from "@/lib/bricks";
import { brickGeometry, frontFace } from "../three/geometry";
import { EXTENTS, extentOf, project, svgViewBox } from "../svg/projector";
import { DIM, studCenters } from "./dims";
import { ghostGeom } from "./ghost";
import { approxMeasure, layoutLabel, VERB_TRACKING } from "./label";
import { BASEPLATE, CAMERA, DEFAULT_FRAMING, MAX_STACK, TRAY_CAMERA, VIEW, brickLayoutItems, coversFor, frameBox, levelY, poseFor } from "./layout";

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
  it("looks down 25° from 26° to the right", () => {
    expect(CAMERA).toEqual({ pitch: 25, azimuth: 26 });
    const [x, y, z] = VIEW;
    expect((Math.asin(y / Math.hypot(x, y, z)) * 180) / Math.PI).toBeCloseTo(25, 5);
    expect((Math.atan2(x, z) * 180) / Math.PI).toBeCloseTo(26, 5);
  });

  it("bakes tray sprites from 24° up, at most 20° round, close to the board's angle", () => {
    expect(TRAY_CAMERA.pitch).toBe(24);
    expect(TRAY_CAMERA.azimuth).toBeLessThanOrEqual(20);
    expect(Math.abs(TRAY_CAMERA.pitch - CAMERA.pitch)).toBeLessThanOrEqual(2);
    expect(Math.abs(TRAY_CAMERA.azimuth - CAMERA.azimuth)).toBeLessThanOrEqual(8);
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

  it("uses a 6x6 baseplate: a 1-stud border beside a 2x4", () => {
    expect(BASEPLATE).toEqual([6, 6]);
  });

  it("fills a portrait desktop board panel with the baseplate, 24 px clear at each side", () => {
    const vb = svgViewBox(430, 542);
    expect(plateW * vb.scale).toBeCloseTo(430 - 48, 0);
    expect(boxH * vb.scale).toBeLessThanOrEqual(DEFAULT_FRAMING.maxH * 542 + 0.01);
  });

  it("keeps the whole 4-brick tower in a wide, short panel", () => {
    const vb = svgViewBox(567, 520);
    const e = extentOf(frameBox(MAX_STACK));
    expect(e.y0).toBeGreaterThanOrEqual(vb.y);
    expect(e.y1).toBeLessThanOrEqual(vb.y + vb.h);
    expect(plateW * vb.scale).toBeLessThanOrEqual(567 - 48 + 0.01);
  });

  it("gives a 144 px phone scene a ~120 px plate", () => {
    const vb = svgViewBox(144, 130);
    expect(boxH * vb.scale).toBeLessThanOrEqual(DEFAULT_FRAMING.maxH * 130 + 0.01);
    expect(plateW * vb.scale).toBeGreaterThan(112);
    expect(plateW * vb.scale).toBeLessThanOrEqual(144 - 2 * 11.9);
  });

  it("frames once: the view box never depends on the stack, and the full tower stays in frame", () => {
    const vb = svgViewBox(567, 600);
    expect(svgViewBox(567, 600)).toEqual(vb);
    const e = extentOf(frameBox(MAX_STACK));
    expect(e.y0).toBeGreaterThanOrEqual(vb.y);
    expect(e.y1).toBeLessThanOrEqual(vb.y + vb.h);
    // the 4th brick may reach the top few per cent, no further
    expect((e.y0 - vb.y) / vb.h).toBeLessThan(0.08);
    // the plate sits below the middle, but an empty board (plate + ghost) is not stranded low
    const plateMid = ((EXTENTS.plate.y0 + EXTENTS.plate.y1) / 2 - vb.y) / vb.h;
    expect(plateMid).toBeGreaterThan(0.5);
    expect(plateMid).toBeLessThan(0.72);
  });
});

describe("onLayout silhouettes", () => {
  it("emits a clockwise convex hull per brick that contains its front face box", () => {
    const vb = svgViewBox(430, 542);
    const px = (p: [number, number, number]): [number, number] => {
      const [x, y] = project(p);
      return [(x - vb.x) * vb.scale, (y - vb.y) * vb.scale];
    };
    const items = brickLayoutItems(toPlacedBricks(["b20", "escrow", "refunds"]), px, 430, 542);
    expect(items).toHaveLength(3);
    for (const it of items) {
      const h = it.hull!;
      expect(h.length).toBeGreaterThanOrEqual(6);
      for (const [x, y] of h) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
      // clockwise on screen (y down): positive shoelace area
      let a = 0;
      for (let i = 0; i < h.length; i++) {
        const [x0, y0] = h[i]!, [x1, y1] = h[(i + 1) % h.length]!;
        a += x0 * y1 - x1 * y0;
      }
      expect(a).toBeGreaterThan(0);
      const xs = h.map((p) => p[0]), ys = h.map((p) => p[1]);
      expect(Math.min(...xs)).toBeLessThanOrEqual(it.cx - it.w / 2 + 1e-3);
      expect(Math.max(...xs)).toBeGreaterThanOrEqual(it.cx + it.w / 2 - 1e-3);
      // the studs rise above the front face's top edge
      expect(Math.min(...ys)).toBeLessThan(it.cy - it.h / 2);
    }
  });
});

describe("stack joints", () => {
  it("marks the top of every brick that has one above it, and only those", () => {
    const bricks = toPlacedBricks(["b20", "payments", "validity"]);
    const c = coversFor(bricks);
    const [bottom, middle, top] = [...bricks].sort((a, b) => a.level - b.level);
    expect(c.get(top!.id)).toBeNull();
    for (const b of [bottom!, middle!]) {
      const r = c.get(b.id)!;
      expect(r).not.toBeNull();
      // a 2x4 on a 2x4: the cover spans the whole top, give or take the sub-mm jitter
      expect(r[2] - r[0]).toBeCloseTo(4 * DIM.pitch - DIM.gap, 5);
      expect(r[3] - r[1]).toBeCloseTo(2 * DIM.pitch - DIM.gap, 5);
      expect(Math.abs(r[0] + r[2]) / 2).toBeLessThan(0.5);
    }
  });

  it("covers a small brick fully when a bigger one sits on it (cantilever)", () => {
    const bricks = toPlacedBricks(["verify", "b20"]);
    const [small, big] = [...bricks].sort((a, b) => a.level - b.level);
    expect(small!.size[0] * small!.size[1]).toBeLessThan(big!.size[0] * big!.size[1]);
    const r = coversFor(bricks).get(small!.id)!;
    const W = (small!.size[0] * DIM.pitch - DIM.gap) / 2;
    expect(r[0]).toBeLessThan(-W);
    expect(r[2]).toBeGreaterThan(W);
  });
});

describe("ghost slot", () => {
  it("is a brick volume standing on the stack, sized to the next brick", () => {
    const g = ghostGeom(6, project, [2, 2]);
    expect(g.size).toEqual([2, 2]);
    expect(g.top).toHaveLength(4);
    expect(g.edges).toHaveLength(3);
    const big = ghostGeom(6, project);
    expect(big.size).toEqual([4, 2]);
    expect(big.bounds.width).toBeGreaterThan(g.bounds.width);
    // its bottom is the top of the stack below: the lowest silhouette point is the slot's front-bottom edge
    const front = project([0, levelY(6), (2 * DIM.pitch - DIM.gap) / 2]);
    expect(Math.max(...big.outline.map((p) => p[1]))).toBeGreaterThanOrEqual(front[1] - 1e-6);
  });

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

describe("print sizes", () => {
  it("prints only the verb, centred, on tray sprites (no name), big enough for the tray", () => {
    for (const l of toPlacedBricks(LEGOS.map((x) => x.id)).map((b) => b)) {
      const face = frontFace(l.size[0], 3);
      const L = layoutLabel(l.label.verb, "", face.width, face.height, approxMeasure);
      expect(L.align).toBe("middle");
      expect(L.name).toHaveLength(0);
      expect(L.x).toBeCloseTo(face.width / 2, 5);
      const verbW = approxMeasure(L.verb.text, "verb", L.verb.size) + L.verb.text.length * L.verb.size * VERB_TRACKING;
      expect(verbW).toBeLessThanOrEqual(face.width - 1.9);
      // cap height inside the face
      expect(L.verb.y - L.verb.size * 0.71).toBeGreaterThan(0.5);
      expect(L.verb.y).toBeLessThan(face.height - 0.5);
      // hero: 7 mm (0.875 stud), others 5.6 mm (0.7 stud) unless a long verb shrinks to fit
      if (l.size[0] === 4 && l.size[1] === 2 && l.label.verb.length <= 6) expect(L.verb.size).toBeCloseTo(7, 5);
    }
  });

  it("keeps board sublabels at >= 9 CSS px on the 1440 board", () => {
    const { scale } = svgViewBox(430, 542);
    for (const b of toPlacedBricks(LEGOS.map((x) => x.id))) {
      const face = frontFace(b.size[0], 3);
      const L = layoutLabel(b.label.verb, b.label.name, face.width, face.height, approxMeasure);
      // A name that splits into <= 2 lines of <= 11 caps (2-wide brick) or any name on a wider brick: >= 9 px.
      const words = b.label.name.split(" ");
      const fits = b.size[0] > 2 || words.some((_, i) => [words.slice(0, i).join(" "), words.slice(i).join(" ")].every((t) => t.length <= 11));
      if (!fits) continue;
      for (const line of L.name) expect([b.id, +(line.size * scale).toFixed(1)]).toEqual([b.id, Math.max(9, +(line.size * scale).toFixed(1))]);
    }
  });
});
