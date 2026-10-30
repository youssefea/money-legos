/** Real brick dimensions in millimetres (1 world unit = 1 mm). */
export const DIM = {
  pitch: 8, // stud to stud
  gap: 0.2, // a brick is 0.1 mm short of the grid on every side
  plate: 3.2, // one plate; a brick is 3 plates = 9.6 mm
  studR: 2.4, // 4.8 mm diameter
  studH: 1.7,
  wall: 1.2,
  top: 1.0, // ceiling thickness
  tubeR: 3.255, // 6.51 mm outer
  tubeIn: 2.4,
  rodR: 1.6, // 1xN underside rod
  cornerR: 0.5, // vertical edge radius
  fillet: 0.36, // top and bottom edge fillet
  studFillet: 0.3,
  /** Hairline between stacked bricks: real stacks never sit perfectly flush. */
  stackGap: 0.15,
} as const;

/** The baseplate is a plate-thick slab; bricks sit on its top face. */
export const BASEPLATE_TOP = DIM.plate;
