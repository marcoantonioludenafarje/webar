/**
 * MotionProbe — how much the phone itself is moving.
 *
 * Automates the "camera in motion" row of lab-02's matrix, and more
 * importantly separates it from "target in motion": the accelerometer can
 * tell whether the *phone* moved, so if tracking degrades while the phone
 * is still, the cause is elsewhere. That distinction is invisible to an
 * operator watching the screen.
 *
 * iOS 13+ gates DeviceMotion behind a permission that can only be
 * requested from a user gesture, so `request()` is called from the Start
 * button rather than at module load. When it is unavailable or denied the
 * probe reports null forever, which the report records as "not measured"
 * — a legitimate outcome under §23.2, unlike a fabricated zero.
 */
type MotionEventCtor = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export class MotionProbe {
  private magnitude: number | null = null;
  private listening = false;
  private readonly handler = (event: DeviceMotionEvent) => {
    const a = event.accelerationIncludingGravity;
    if (!a || (a.x === null && a.y === null && a.z === null)) return;
    const x = a.x ?? 0;
    const y = a.y ?? 0;
    const z = a.z ?? 0;
    // Subtract 1g so a phone resting on a table reads ~0 rather than 9.8,
    // which makes the "is it moving" threshold intuitive.
    const raw = Math.sqrt(x * x + y * y + z * z);
    const net = Math.abs(raw - 9.81);
    // Light smoothing — raw accelerometer output is noisy enough that an
    // unsmoothed threshold flickers between states several times a second.
    this.magnitude = this.magnitude === null ? net : this.magnitude * 0.7 + net * 0.3;
  };

  /**
   * Ask for permission if the platform requires it and start listening.
   * Must be called from within a user gesture on iOS. Returns whether the
   * probe will actually produce readings.
   */
  async request(): Promise<boolean> {
    if (this.listening) return true;
    if (typeof DeviceMotionEvent === "undefined") return false;

    const ctor = DeviceMotionEvent as MotionEventCtor;
    if (typeof ctor.requestPermission === "function") {
      try {
        if ((await ctor.requestPermission()) !== "granted") return false;
      } catch {
        return false;
      }
    }

    window.addEventListener("devicemotion", this.handler);
    this.listening = true;
    return true;
  }

  stop(): void {
    if (!this.listening) return;
    window.removeEventListener("devicemotion", this.handler);
    this.listening = false;
  }

  /** Net acceleration in m/s² with gravity removed, or null if unmeasured. */
  read(): number | null {
    return this.magnitude === null ? null : Math.round(this.magnitude * 100) / 100;
  }

  isAvailable(): boolean {
    return this.listening;
  }
}
