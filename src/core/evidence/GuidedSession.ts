import type { EvidenceSample, Primitive, StepOutcome, StepResult } from "./types";

/**
 * GuidedSession — walks the operator through a lab's physical test matrix.
 *
 * The split that matters: a step is either **auto**, meaning the browser
 * can tell on its own when the condition is met (distance, angle,
 * brightness, motion), or **manual**, meaning it cannot and must ask
 * (occlusion, who moved the target, subjective judgement). Auto steps
 * remove transcription; manual steps are where the operator's attention
 * is genuinely irreplaceable, so they are kept few and explicit.
 *
 * Core stays AR-agnostic: conditions are predicates over EvidenceSample,
 * so lab-02 supplies pose-derived fields without core importing anything
 * from MindAR or A-Frame.
 */

export interface AutoCondition {
  /** True while the physical condition holds. */
  ok(sample: EvidenceSample): boolean;
  /** Live feedback, e.g. "78 cm — acércate un poco". */
  hint(sample: EvidenceSample): string;
  /** How long it must hold before the step passes. */
  holdMs: number;
  /** Sample fields to freeze into the step's `measured` record. */
  capture: string[];
}

export interface GuidedStep {
  id: string;
  /** The instruction, in the operator's language. */
  label: string;
  /** Which README row or acceptance criterion this fills. */
  fills: string;
  /** Present for auto steps, absent for manual ones. */
  auto?: AutoCondition;
  /** Prompt for a free-text note when the step resolves. */
  askNote?: boolean;
  /**
   * Turns the step into a multiple choice. Used for facts the browser
   * cannot know but that later measurements depend on — lab-02 asks the
   * printed width of the target this way, because without it a distance
   * in target-widths cannot be reported in centimetres.
   */
  choices?: string[];
  /** After this long without success, offer to give up. Auto steps only. */
  timeoutMs?: number;
}

export type SessionPhase = "idle" | "running" | "done";

export interface SessionView {
  phase: SessionPhase;
  index: number;
  total: number;
  step: GuidedStep | null;
  /** Live hint for auto steps; empty for manual ones. */
  hint: string;
  /** 0–1 progress of the hold timer, for a progress bar. */
  holdProgress: number;
  /** True once the operator has waited long enough to be offered a bail-out. */
  timedOut: boolean;
  results: StepResult[];
}

const DEFAULT_TIMEOUT_MS = 45_000;

export class GuidedSession {
  private phase: SessionPhase = "idle";
  private index = 0;
  private readonly results: StepResult[] = [];

  private stepStartedAt = 0;
  private holdSince: number | null = null;
  private hint = "";
  private holdProgress = 0;
  private timedOut = false;

  private changeListeners: Array<(view: SessionView) => void> = [];

  constructor(
    private readonly steps: GuidedStep[],
    /** Elapsed-time source, shared with the recorder so timestamps align. */
    private readonly now: () => number,
  ) {}

  onChange(listener: (view: SessionView) => void): void {
    this.changeListeners.push(listener);
  }

  start(): void {
    if (this.phase === "running") return;
    this.phase = "running";
    this.index = 0;
    this.results.length = 0;
    this.beginStep();
  }

  view(): SessionView {
    return {
      phase: this.phase,
      index: this.index,
      total: this.steps.length,
      step: this.phase === "running" ? (this.steps[this.index] ?? null) : null,
      hint: this.hint,
      holdProgress: this.holdProgress,
      timedOut: this.timedOut,
      results: [...this.results],
    };
  }

  isRunning(): boolean {
    return this.phase === "running";
  }

  getResults(): StepResult[] {
    return [...this.results];
  }

  /** Drive auto steps. Called from the recorder's sample listener. */
  feed(sample: EvidenceSample): void {
    if (this.phase !== "running") return;
    const step = this.steps[this.index];
    if (!step?.auto) return;

    const condition = step.auto;
    this.hint = condition.hint(sample);

    const elapsed = this.now() - this.stepStartedAt;
    this.timedOut = elapsed > (step.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    if (condition.ok(sample)) {
      if (this.holdSince === null) this.holdSince = this.now();
      const held = this.now() - this.holdSince;
      this.holdProgress = Math.min(1, held / condition.holdMs);

      if (held >= condition.holdMs) {
        this.resolve("pass", "", captureFrom(sample, condition.capture));
        return;
      }
    } else {
      // Reset rather than accumulate: the point of holdMs is that the
      // condition was sustained, not that it flickered true often enough.
      this.holdSince = null;
      this.holdProgress = 0;
    }

    this.emit();
  }

  /** Resolve the current step from the UI (manual steps, or giving up). */
  resolve(outcome: StepOutcome, note = "", measured: Record<string, Primitive> = {}): void {
    if (this.phase !== "running") return;
    const step = this.steps[this.index];
    if (!step) return;

    this.results.push({
      id: step.id,
      label: step.label,
      fills: step.fills,
      auto: Boolean(step.auto),
      outcome,
      note,
      startedAt: this.stepStartedAt,
      endedAt: this.now(),
      measured,
    });

    this.index += 1;
    if (this.index >= this.steps.length) {
      this.phase = "done";
      this.hint = "";
      this.holdProgress = 0;
      this.emit();
      return;
    }
    this.beginStep();
  }

  /**
   * Freeze whatever the last sample showed, for a manual step. A failed
   * occlusion test still carries useful context — how far away, how
   * bright — that the operator should not have to write down.
   */
  captureContext(sample: EvidenceSample | null, fields: string[]): Record<string, Primitive> {
    return sample ? captureFrom(sample, fields) : {};
  }

  private beginStep(): void {
    this.stepStartedAt = this.now();
    this.holdSince = null;
    this.holdProgress = 0;
    this.timedOut = false;
    this.hint = "";
    this.emit();
  }

  private emit(): void {
    const view = this.view();
    for (const listener of this.changeListeners) listener(view);
  }
}

function captureFrom(sample: EvidenceSample, fields: string[]): Record<string, Primitive> {
  const captured: Record<string, Primitive> = {};
  for (const field of fields) {
    if (field in sample) captured[field] = sample[field];
  }
  return captured;
}
