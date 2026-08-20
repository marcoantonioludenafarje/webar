import type { Object3DLike } from "./TargetPose";

/**
 * JitterProbe — how much an anchored object shakes when it should be still.
 *
 * This is the measurement LAB A3 exists for, and the naive version is
 * wrong: the raw variance of the anchor's position mostly measures the
 * operator's hand, not the tracker. Someone slowly walking around the
 * target produces enormous positional variance and zero perceived jitter,
 * while a phone held rock-still with a twitchy tracker produces little
 * variance and looks awful.
 *
 * So what is measured is the *high-frequency residual*: each sample is
 * compared against a short centred moving average of its neighbours.
 * Smooth motion — hand drift, walking — passes through the average and
 * cancels out. Frame-to-frame twitch does not, and is what remains.
 *
 * Fed from the render loop rather than the recorder's slow sampling tick:
 * jitter lives at frame rate, and sampling it twice a second would alias
 * it into noise that means nothing.
 */

/** Samples kept — about one second at 60 fps. */
const WINDOW = 60;

/**
 * Below this many samples there is no reading, only noise.
 *
 * Deliberately an absolute floor rather than something derived from the
 * kernel width: tying it to the kernel meant that narrowing the kernel
 * silently lowered the bar to six samples, and a jitter figure computed
 * from four interior points is not a measurement — it just looks like one
 * in the report. Roughly a third of a second at 60 fps.
 */
const MIN_SAMPLES = 20;

/**
 * Half-width of the centred smoothing kernel.
 *
 * 1 (a 3-tap average), not more. The rejection of smooth motion degrades
 * as the kernel widens — a wider average is a smoother reference, so more
 * of the operator's real movement is counted as residual. Measured on
 * synthetic cases, radius 1 discriminates twitch from a hand sweep about
 * 2.5x better than radius 2 while giving up little sensitivity.
 *
 * Known limitation: rejection is exact only for constant-velocity motion.
 * Curved motion leaks through in proportion to amplitude x frequency², so
 * a fast hand arc registers a small false reading. That is why the guided
 * session gates its jitter steps on the accelerometer reporting the phone
 * held still — the regime where this measurement is trustworthy.
 */
const SMOOTH_RADIUS = 1;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface JitterReading {
  /** RMS high-frequency residual, in target-widths. */
  rmsUnits: number;
  /** The worst single residual in the window — what the eye notices. */
  peakUnits: number;
  /** How many samples the reading is based on. */
  samples: number;
}

export class JitterProbe {
  private readonly history: Vec3[] = [];

  /** Call once per rendered frame while the target is tracked. */
  sample(object3D: Object3DLike | undefined | null): void {
    if (!object3D) return;
    const { x, y, z } = object3D.position;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;

    this.history.push({ x, y, z });
    if (this.history.length > WINDOW) this.history.shift();
  }

  /** Discard history — call on target loss so a gap isn't read as a jump. */
  reset(): void {
    this.history.length = 0;
  }

  read(): JitterReading | null {
    const window = 2 * SMOOTH_RADIUS + 1;
    if (this.history.length < MIN_SAMPLES) return null;

    let sumSquares = 0;
    let peak = 0;
    let count = 0;

    // Only interior samples have a full neighbourhood; the edges are
    // skipped rather than smoothed against a truncated kernel, which would
    // bias their residual upward and inflate the peak.
    for (let i = SMOOTH_RADIUS; i < this.history.length - SMOOTH_RADIUS; i += 1) {
      const smoothed = { x: 0, y: 0, z: 0 };
      for (let k = -SMOOTH_RADIUS; k <= SMOOTH_RADIUS; k += 1) {
        smoothed.x += this.history[i + k].x;
        smoothed.y += this.history[i + k].y;
        smoothed.z += this.history[i + k].z;
      }
      smoothed.x /= window;
      smoothed.y /= window;
      smoothed.z /= window;

      const dx = this.history[i].x - smoothed.x;
      const dy = this.history[i].y - smoothed.y;
      const dz = this.history[i].z - smoothed.z;
      const residual = Math.sqrt(dx * dx + dy * dy + dz * dz);

      sumSquares += residual * residual;
      if (residual > peak) peak = residual;
      count += 1;
    }

    if (count === 0) return null;

    return {
      rmsUnits: round(Math.sqrt(sumSquares / count), 5),
      peakUnits: round(peak, 5),
      samples: count,
    };
  }

  /**
   * Same reading in millimetres, once the printed target width is known.
   * Target-widths are the honest native unit, but "0.4 mm of shake" is
   * what a person can actually picture.
   */
  readMm(targetWidthCm: number | null): { rmsMm: number; peakMm: number } | null {
    const reading = this.read();
    if (!reading || targetWidthCm === null) return null;
    const mmPerUnit = targetWidthCm * 10;
    return {
      rmsMm: round(reading.rmsUnits * mmPerUnit, 2),
      peakMm: round(reading.peakUnits * mmPerUnit, 2),
    };
  }
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
