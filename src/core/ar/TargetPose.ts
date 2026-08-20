/**
 * Pose maths for MindAR targets — turns the tracked transform into the two
 * numbers the labs are actually about: how far away the target is, and how
 * obliquely we are looking at it.
 *
 * Lived in `labs/lab-02-image-tracking/` until LAB A3 needed the same
 * readings to measure jitter against distance. That second consumer is
 * what promotes it to core under this repo's rule (CLAUDE.md §4) — not the
 * suspicion, back in A2, that it would eventually be shared.
 *
 * Why this works: the scene's <a-camera> is pinned at the origin with
 * look-controls disabled, so MindAR moves the *anchor* rather than the
 * camera. The anchor's world position is therefore already the
 * camera→target vector, and no camera matrix inversion is needed.
 *
 * Units: MindAR normalises a target so its width is 1 unit. Distances are
 * reported in target-widths, which is the honest unit — converting to
 * centimetres requires knowing how large the target was printed, which
 * only the operator can say.
 */

interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

interface QuatLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** The subset of THREE.Object3D we touch — avoids depending on THREE types. */
export interface Object3DLike {
  position: Vec3Like;
  quaternion: QuatLike;
  visible: boolean;
}

export interface TargetPose {
  /** Camera→target distance in target-widths. */
  distanceUnits: number;
  /**
   * Angle in degrees between the target's surface normal and the line of
   * sight. 0 = looking straight at it, 90 = edge-on.
   */
  angleDeg: number;
}

export function readPose(object3D: Object3DLike): TargetPose | null {
  const p = object3D.position;
  const distanceUnits = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);

  // A target sitting exactly on the camera is not a real reading; it is
  // what an uninitialised matrix looks like.
  if (!Number.isFinite(distanceUnits) || distanceUnits < 1e-4) return null;

  // The target's own +Z axis is its surface normal, rotated into world
  // space by the tracked orientation.
  const normal = applyQuaternion({ x: 0, y: 0, z: 1 }, object3D.quaternion);

  // Direction from the target back towards the camera (camera is at origin).
  const toCamera = {
    x: -p.x / distanceUnits,
    y: -p.y / distanceUnits,
    z: -p.z / distanceUnits,
  };

  const dot = normal.x * toCamera.x + normal.y * toCamera.y + normal.z * toCamera.z;
  // abs() because whether the normal points towards or away from the camera
  // depends on the target's handedness, which we do not control and which
  // does not change the viewing angle being measured.
  const angleRad = Math.acos(clamp(Math.abs(dot), 0, 1));

  return {
    distanceUnits: round(distanceUnits, 3),
    angleDeg: round((angleRad * 180) / Math.PI, 1),
  };
}

/**
 * Rotate a vector by a quaternion: v + 2 * qv × (qv × v + w * v).
 * Written out rather than pulling in THREE, which is loaded as a global
 * by A-Frame's CDN bundle and has no types available here.
 */
function applyQuaternion(v: Vec3Like, q: QuatLike): Vec3Like {
  const t = {
    x: 2 * (q.y * v.z - q.z * v.y),
    y: 2 * (q.z * v.x - q.x * v.z),
    z: 2 * (q.x * v.y - q.y * v.x),
  };
  return {
    x: v.x + q.w * t.x + (q.y * t.z - q.z * t.y),
    y: v.y + q.w * t.y + (q.z * t.x - q.x * t.z),
    z: v.z + q.w * t.z + (q.x * t.y - q.y * t.x),
  };
}

/**
 * Parse the printed-width answer ("~9 cm (tarjeta)") into centimetres, so
 * distances can be reported in a unit a person can picture. Returns null
 * when the answer carries no number — better an absent conversion than a
 * confident wrong one.
 */
export function parseTargetWidthCm(answer: string): number | null {
  const match = answer.match(/(\d+(?:[.,]\d+)?)\s*cm/i);
  if (!match) return null;
  const value = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
