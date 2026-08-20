import type {
  EvidenceEvent,
  EvidenceSample,
  FpsSummary,
  Primitive,
} from "./types";
import { LuminanceProbe } from "./LuminanceProbe";
import { MotionProbe } from "./MotionProbe";

/**
 * EvidenceRecorder — the timeline behind every report.
 *
 * `MetricsService.exportJson()` writes a single final snapshot, which
 * cannot answer the question lab-01 actually asks ("does FPS degrade over
 * several minutes?") — a snapshot taken at minute five looks identical
 * whether the session was rock solid or collapsing. This records the
 * shape of the whole session instead.
 *
 * Deliberately dependency-free and in-memory: no backend, no storage, per
 * PLAYBOOK §17 and this repo's out-of-scope list.
 */

/** Beyond this, samples are decimated rather than dropped — see `sample()`. */
const MAX_SAMPLES = 4000;

export interface RecorderOptions {
  /** Where FPS comes from; normally `() => metrics.getFps()`. */
  fps: () => number;
  /** Sampling period in ms. 500 keeps 10 minutes well inside the cap. */
  intervalMs?: number;
}

export class EvidenceRecorder {
  readonly luminance = new LuminanceProbe();
  readonly motion = new MotionProbe();

  private readonly samples: EvidenceSample[] = [];
  private readonly events: EvidenceEvent[] = [];
  private readonly probes = new Map<string, () => Primitive>();

  private startedAtMs = 0;
  private startedAtIso = "";
  private timer: number | null = null;
  private decimated = false;
  private effectiveIntervalMs: number;
  private latest: EvidenceSample | null = null;
  private listeners: Array<(sample: EvidenceSample) => void> = [];

  constructor(private readonly options: RecorderOptions) {
    this.effectiveIntervalMs = options.intervalMs ?? 500;
  }

  /**
   * Register a lab-specific measurement. Called every sample, so it must
   * be cheap and must never throw — a probe that throws would take the
   * whole timeline down mid-session, losing evidence already captured.
   */
  addProbe(name: string, read: () => Primitive): void {
    this.probes.set(name, read);
  }

  onSample(listener: (sample: EvidenceSample) => void): void {
    this.listeners.push(listener);
  }

  isRecording(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer !== null) return;
    this.startedAtMs = performance.now();
    this.startedAtIso = new Date().toISOString();
    this.samples.length = 0;
    this.events.length = 0;
    this.decimated = false;
    this.effectiveIntervalMs = this.options.intervalMs ?? 500;

    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.event("recording-started");
    this.timer = window.setInterval(() => this.sample(), this.effectiveIntervalMs);
    this.sample();
  }

  stop(): void {
    if (this.timer === null) return;
    window.clearInterval(this.timer);
    this.timer = null;
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.motion.stop();
    this.event("recording-stopped");
  }

  event(kind: string, detail?: string): void {
    this.events.push({ t: this.elapsedMs(), kind, ...(detail ? { detail } : {}) });
  }

  elapsedMs(): number {
    return this.startedAtMs === 0 ? 0 : Math.round(performance.now() - this.startedAtMs);
  }

  getSamples(): EvidenceSample[] {
    return [...this.samples];
  }

  getEvents(): EvidenceEvent[] {
    return [...this.events];
  }

  getLatestSample(): EvidenceSample | null {
    return this.latest;
  }

  wasDecimated(): boolean {
    return this.decimated;
  }

  getStartedAtIso(): string {
    return this.startedAtIso;
  }

  /**
   * Backgrounding is itself a lab-01 acceptance criterion ("does the
   * browser kill the stream in background?"), so it is recorded as an
   * event rather than merely tolerated.
   */
  private readonly onVisibilityChange = (): void => {
    this.event(document.hidden ? "page-hidden" : "page-visible");
  };

  private sample(): void {
    const sample: EvidenceSample = {
      t: this.elapsedMs(),
      fps: this.options.fps(),
      luminance: this.luminance.read(),
      motion: this.motion.read(),
    };

    for (const [name, read] of this.probes) {
      try {
        sample[name] = read();
      } catch {
        // A broken probe degrades one column, not the session.
        sample[name] = null;
      }
    }

    this.samples.push(sample);
    this.latest = sample;

    if (this.samples.length > MAX_SAMPLES) this.decimate();

    for (const listener of this.listeners) listener(sample);
  }

  /**
   * Halve the resolution instead of truncating. A long session then keeps
   * its overall shape — which is what a degradation question needs —
   * rather than keeping only its first ten minutes in full detail.
   */
  private decimate(): void {
    for (let i = this.samples.length - 1; i >= 0; i -= 2) {
      this.samples.splice(i, 1);
    }
    this.decimated = true;
    this.effectiveIntervalMs *= 2;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = window.setInterval(() => this.sample(), this.effectiveIntervalMs);
    }
  }
}

/**
 * Summarise the FPS timeline.
 *
 * Reports p5 rather than the raw minimum because a single stalled frame
 * during startup is not the same finding as sustained stutter, and the
 * two are indistinguishable in a min. `retentionPct` compares the first
 * fifth of the session against the last — the direct answer to lab-01's
 * thermal/battery degradation question.
 */
export function summariseFps(samples: EvidenceSample[]): FpsSummary | null {
  const values = samples.map((s) => s.fps).filter((n) => Number.isFinite(n) && n > 0);
  if (values.length < 4) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const fifth = Math.max(1, Math.floor(values.length / 5));
  const firstFifth = mean(values.slice(0, fifth));
  const lastFifth = mean(values.slice(-fifth));

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: percentile(sorted, 50),
    p5: percentile(sorted, 5),
    firstFifth: round1(firstFifth),
    lastFifth: round1(lastFifth),
    retentionPct: firstFifth === 0 ? 0 : Math.round((lastFifth / firstFifth) * 100),
  };
}

function percentile(sorted: number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, n) => total + n, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
