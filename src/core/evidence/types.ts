/**
 * Shared shapes for the evidence harness (PLAYBOOK §23.4).
 *
 * The harness exists because human validation is the scarce resource in
 * this workspace: every measurement a lab asks a person to write down by
 * hand is a measurement that will eventually be skipped, misremembered or
 * transcribed wrong. Anything the browser can observe on its own belongs
 * here; the operator is only asked about what genuinely cannot be
 * deduced (occlusion, who moved, subjective judgement).
 */

export type Primitive = string | number | boolean | null;

/**
 * One periodic snapshot of everything measurable at an instant.
 *
 * Labs add their own fields through `EvidenceRecorder.addProbe()` — e.g.
 * lab-02 contributes `distanceUnits` and `angleDeg` derived from the
 * MindAR pose. The index signature is what lets a generic GuidedSession
 * evaluate lab-specific conditions without core knowing about AR.
 */
export interface EvidenceSample {
  /** Milliseconds since the recorder started. */
  t: number;
  fps: number;
  /** Mean luma 0–255 of the camera frame, or null when unavailable. */
  luminance: number | null;
  /** Device motion magnitude in m/s², or null when unavailable. */
  motion: number | null;
  [key: string]: Primitive;
}

/** A timestamped thing that happened. Unlike EventLog, never truncated. */
export interface EvidenceEvent {
  t: number;
  kind: string;
  detail?: string;
}

export type StepOutcome = "pass" | "fail" | "skipped";

export interface StepResult {
  id: string;
  label: string;
  /** Which README row / acceptance criterion this step fills. */
  fills: string;
  auto: boolean;
  outcome: StepOutcome;
  /** Free text from the operator. Empty string when they said nothing. */
  note: string;
  startedAt: number;
  endedAt: number;
  /** Sample fields captured at the moment the step resolved. */
  measured: Record<string, Primitive>;
}

export interface DeviceProfile {
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  screen: string;
  viewport: string;
  devicePixelRatio: number;
  hardwareConcurrency: number | null;
  deviceMemoryGb: number | null;
  maxTouchPoints: number;
  /** Heuristic only — reported as a hint, never as ground truth. */
  probablyMobile: boolean;
}

export interface FpsSummary {
  min: number;
  max: number;
  median: number;
  p5: number;
  /** Mean of the first fifth of the session vs the last fifth. */
  firstFifth: number;
  lastFifth: number;
  /** lastFifth/firstFifth as a percentage; <100 means it degraded. */
  retentionPct: number;
}

export interface SessionReport {
  lab: string;
  labTitle: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  device: DeviceProfile;
  /** Whatever the lab knows about the live camera track. */
  camera: Record<string, Primitive>;
  fps: FpsSummary | null;
  steps: StepResult[];
  events: EvidenceEvent[];
  samples: EvidenceSample[];
  /** True when samples were decimated to stay within the cap. */
  samplesDecimated: boolean;
  summary: Record<string, Primitive>;
  operatorNotes: string;
}
