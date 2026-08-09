/**
 * MetricsService — generic, backend-free observability primitive (§8).
 *
 * Responsibilities kept intentionally small for Demo 01:
 *  - rolling FPS estimate via requestAnimationFrame sampling,
 *  - session duration timer,
 *  - an arbitrary key/value bag for demo-specific metrics
 *    (resolution, facing mode, errors, etc.),
 *  - JSON export for saving experiment evidence locally.
 *
 * Demos 02+ are expected to add their own metric keys (target found/lost,
 * acquisition time, ...) through `set()` rather than requiring changes here.
 */
export type MetricValue = string | number | boolean | null;

export class MetricsService {
  private readonly values = new Map<string, MetricValue>();
  private readonly sessionStart = performance.now();

  private fps = 0;
  private frameCount = 0;
  private fpsWindowStart = performance.now();
  private rafHandle: number | null = null;

  /** Start the FPS sampling loop. Safe to call once; no-op if already running. */
  startFpsLoop(): void {
    if (this.rafHandle !== null) return;

    const tick = () => {
      this.frameCount += 1;
      const now = performance.now();
      const elapsed = now - this.fpsWindowStart;

      // Recompute FPS about once per second so the number is readable
      // instead of jittering every frame.
      if (elapsed >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.fpsWindowStart = now;
      }

      this.rafHandle = requestAnimationFrame(tick);
    };

    this.rafHandle = requestAnimationFrame(tick);
  }

  stopFpsLoop(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  getFps(): number {
    return this.fps;
  }

  getSessionSeconds(): number {
    return (performance.now() - this.sessionStart) / 1000;
  }

  formatSessionDuration(): string {
    const totalSeconds = Math.floor(this.getSessionSeconds());
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  set(key: string, value: MetricValue): void {
    this.values.set(key, value);
  }

  get(key: string): MetricValue | undefined {
    return this.values.get(key);
  }

  /** Snapshot of all metrics, including FPS and session duration. */
  toSnapshot(): Record<string, MetricValue> {
    return {
      fps: this.fps,
      session: this.formatSessionDuration(),
      ...Object.fromEntries(this.values),
    };
  }

  /** Serialize the current snapshot and trigger a local JSON download. */
  exportJson(filenamePrefix: string): void {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      ...this.toSnapshot(),
      sessionSeconds: Math.floor(this.getSessionSeconds()),
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenamePrefix}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
