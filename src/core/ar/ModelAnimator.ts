/**
 * ModelAnimator — plays and switches the animation clips inside a GLB.
 *
 * A-Frame 1.5 does not ship an animation mixer; clip playback normally
 * comes from aframe-extras. Driving three.js's own AnimationMixer instead
 * costs about forty lines and avoids a third CDN dependency in a lab whose
 * whole point is measuring cost (CLAUDE.md §3, PLAYBOOK §17). It also puts
 * clip switching under our control, which LAB A3 has to measure rather
 * than merely use.
 *
 * three.js is reached through the global A-Frame publishes rather than an
 * npm import: A-Frame and MindAR load as classic scripts from a CDN, and
 * bundling a second copy of three would both bloat the page and risk two
 * incompatible instances.
 */

/** The slice of THREE.AnimationMixer this uses. */
interface MixerLike {
  clipAction(clip: unknown): { reset(): ActionLike; play(): ActionLike; stop(): void; fadeIn(d: number): ActionLike };
  update(deltaSeconds: number): void;
  stopAllAction(): void;
}

interface ActionLike {
  play(): ActionLike;
  fadeIn(duration: number): ActionLike;
}

interface AnimationClipLike {
  name: string;
  duration: number;
}

/** A loaded glTF scene, as A-Frame's gltf-model component exposes it. */
export interface AnimatedModel {
  animations?: AnimationClipLike[];
}

interface ThreeLike {
  AnimationMixer: new (root: unknown) => MixerLike;
}

export class ModelAnimator {
  private mixer: MixerLike | null = null;
  private clips: AnimationClipLike[] = [];
  private current: string | null = null;
  private lastUpdate = 0;

  /**
   * Bind to a freshly loaded model. Returns the clip names found, which is
   * also the answer to one of A3's questions — whether multiple clips
   * survive the export/load round trip at all.
   */
  attach(model: AnimatedModel): string[] {
    const three = (window as unknown as { AFRAME?: { THREE?: ThreeLike } }).AFRAME?.THREE;
    if (!three) {
      this.mixer = null;
      return [];
    }

    this.mixer = new three.AnimationMixer(model);
    this.clips = model.animations ?? [];
    this.current = null;
    this.lastUpdate = performance.now();
    return this.clips.map((clip) => clip.name);
  }

  detach(): void {
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.clips = [];
    this.current = null;
  }

  /** Cross-fades to a clip. Returns false if there is no such clip. */
  play(name: string, fadeSeconds = 0.25): boolean {
    const clip = this.clips.find((candidate) => candidate.name === name);
    if (!this.mixer || !clip) return false;

    // stopAllAction rather than fading the outgoing clip: with two clips
    // driving the same bones, a cross-fade of equal weights leaves limbs
    // averaged into a pose that belongs to neither, which reads as a bug
    // during a jitter measurement.
    this.mixer.stopAllAction();
    this.mixer.clipAction(clip).reset().fadeIn(fadeSeconds).play();
    this.current = name;
    return true;
  }

  /**
   * Advance playback. Call once per rendered frame.
   *
   * Uses its own wall-clock delta instead of a caller-supplied one so a
   * dropped frame slows the animation down rather than making it jump —
   * a jump would be indistinguishable from tracking jitter in the very
   * measurement this lab is taking.
   */
  update(): void {
    if (!this.mixer) return;
    const now = performance.now();
    const delta = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    // Clamp: returning from a backgrounded tab produces a huge delta that
    // would fast-forward the clip through several cycles at once.
    this.mixer.update(Math.min(delta, 0.1));
  }

  getClips(): string[] {
    return this.clips.map((clip) => clip.name);
  }

  getCurrentClip(): string | null {
    return this.current;
  }

  isReady(): boolean {
    return this.mixer !== null;
  }
}

/**
 * What the browser actually spent fetching a model.
 *
 * Read from the Resource Timing API rather than timed around the load
 * event: that would fold decode and scene-graph construction into the same
 * number as transfer, and A3 needs to know which of the two dominates
 * before concluding anything about asset budgets. `transferSize` is 0 for
 * a cache hit, which is itself worth reporting.
 */
export function readTransferStats(url: string): {
  transferKb: number | null;
  encodedKb: number | null;
  durationMs: number | null;
  cached: boolean;
} {
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const entry = [...entries].reverse().find((candidate) => candidate.name.includes(url));
  if (!entry) return { transferKb: null, encodedKb: null, durationMs: null, cached: false };

  return {
    transferKb: Math.round(entry.transferSize / 102.4) / 10,
    encodedKb: Math.round(entry.encodedBodySize / 102.4) / 10,
    durationMs: Math.round(entry.duration),
    cached: entry.transferSize === 0 && entry.encodedBodySize > 0,
  };
}
