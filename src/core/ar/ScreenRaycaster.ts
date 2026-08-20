/**
 * ScreenRaycaster — turns a screen tap into a hit test against an AR object,
 * and records enough about the miss to explain it.
 *
 * LAB A4 asks whether an AR object can behave like a UI element. The
 * useful answer is not "taps work" — it is *how close to the object you
 * have to tap* before it responds reliably. A hit/miss boolean cannot
 * produce that; the pixel distance between the tap and the object's
 * projected position can, and it turns "interaction feels unreliable"
 * into a number a designer can act on (make the hit area N px).
 *
 * three.js is reached through A-Frame's global, same as ModelAnimator —
 * bundling a second copy would risk two incompatible instances.
 */

export interface TapResult {
  hit: boolean;
  /** Where the finger landed, in CSS pixels relative to the viewport. */
  screenX: number;
  screenY: number;
  /** The object's centre projected to the screen, or null if off-camera. */
  objectX: number | null;
  objectY: number | null;
  /** Distance from the tap to that centre, in CSS pixels. */
  pixelDistance: number | null;
  /** Distance along the ray to the hit, in target-widths. */
  hitDistanceUnits: number | null;
}

interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

interface RaycasterLike {
  setFromCamera(coords: { x: number; y: number }, camera: unknown): void;
  intersectObject(object: unknown, recursive: boolean): Array<{ distance: number }>;
}

interface ThreeLike {
  Raycaster: new () => RaycasterLike;
  Vector3: new (x?: number, y?: number, z?: number) => Vector3Like & {
    setFromMatrixPosition(matrix: unknown): Vector3Like;
    project(camera: unknown): Vector3Like;
  };
}

interface Object3DWithMatrix {
  matrixWorld: unknown;
  visible: boolean;
}

export class ScreenRaycaster {
  private raycaster: RaycasterLike | null = null;

  private three(): ThreeLike | null {
    return (window as unknown as { AFRAME?: { THREE?: ThreeLike } }).AFRAME?.THREE ?? null;
  }

  isAvailable(): boolean {
    return this.three() !== null;
  }

  /**
   * Hit-test a tap against `object3D`.
   *
   * `camera` is A-Frame's active THREE camera (`sceneEl.camera`), which in
   * a MindAR scene stays at the origin — the anchor moves instead. That
   * does not change the maths here, but it does mean a miss is always
   * about where the object was drawn, never about camera drift.
   */
  test(
    clientX: number,
    clientY: number,
    object3D: Object3DWithMatrix | null | undefined,
    camera: unknown,
  ): TapResult | null {
    const three = this.three();
    if (!three || !object3D || !camera) return null;

    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const ndc = toNormalisedDevice(clientX, clientY, viewport);

    if (!this.raycaster) this.raycaster = new three.Raycaster();
    this.raycaster.setFromCamera(ndc, camera);

    // recursive: the model is a hierarchy of limb nodes, so testing only
    // the root would never hit anything.
    const hits = object3D.visible ? this.raycaster.intersectObject(object3D, true) : [];

    const centre = new three.Vector3();
    centre.setFromMatrixPosition(object3D.matrixWorld);
    const projected = centre.project(camera);

    // z outside [-1, 1] means the point is behind the camera or beyond the
    // far plane; its projected x/y are meaningless there, so report null
    // rather than a plausible-looking coordinate.
    const onScreen = projected.z >= -1 && projected.z <= 1;
    const objectX = onScreen ? ((projected.x + 1) / 2) * viewport.width : null;
    const objectY = onScreen ? ((1 - projected.y) / 2) * viewport.height : null;

    return {
      hit: hits.length > 0,
      screenX: Math.round(clientX),
      screenY: Math.round(clientY),
      objectX: objectX === null ? null : Math.round(objectX),
      objectY: objectY === null ? null : Math.round(objectY),
      pixelDistance:
        objectX === null || objectY === null
          ? null
          : Math.round(Math.hypot(clientX - objectX, clientY - objectY)),
      hitDistanceUnits: hits.length > 0 ? Math.round(hits[0].distance * 1000) / 1000 : null,
    };
  }
}

/**
 * Screen pixels to normalised device coordinates (-1..1, y flipped).
 *
 * Pure and exported so it can be tested without a browser — it is the step
 * where a sign error silently shifts every hit test to the wrong half of
 * the screen, which on-device looks like "taps are just unreliable".
 */
export function toNormalisedDevice(
  clientX: number,
  clientY: number,
  viewport: { width: number; height: number },
): { x: number; y: number } {
  return {
    x: (clientX / viewport.width) * 2 - 1,
    y: -(clientY / viewport.height) * 2 + 1,
  };
}

/**
 * Summary of a tap session — the actual output of LAB A4.
 *
 * Median rather than mean latency: one garbage-collection pause during a
 * tap would drag a mean somewhere no user ever experienced.
 */
export interface TapSummary {
  taps: number;
  hits: number;
  hitRatePct: number;
  medianLatencyMs: number | null;
  p90LatencyMs: number | null;
  /** How far the misses landed from the object, median, in pixels. */
  medianMissDistancePx: number | null;
  /** The closest miss — if this is small, the hit area is the problem. */
  closestMissPx: number | null;
}

export function summariseTaps(
  taps: Array<TapResult & { latencyMs: number | null }>,
): TapSummary {
  const hits = taps.filter((tap) => tap.hit);
  const latencies = taps
    .map((tap) => tap.latencyMs)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  const missDistances = taps
    .filter((tap) => !tap.hit && tap.pixelDistance !== null)
    .map((tap) => tap.pixelDistance as number)
    .sort((a, b) => a - b);

  return {
    taps: taps.length,
    hits: hits.length,
    hitRatePct: taps.length === 0 ? 0 : Math.round((hits.length / taps.length) * 100),
    medianLatencyMs: percentile(latencies, 50),
    p90LatencyMs: percentile(latencies, 90),
    medianMissDistancePx: percentile(missDistances, 50),
    closestMissPx: missDistances.length > 0 ? missDistances[0] : null,
  };
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[index]);
}
