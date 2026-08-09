/**
 * EventLog — capped, timestamped list of debug events (§8).
 *
 * Exists because mobile testers have no DevTools console. Anything that
 * would normally be a `console.log` during AR lifecycle debugging
 * (permission prompts, library init, tracking state changes, errors)
 * should also go here so it's visible on-screen via DebugOverlay. Mirrors
 * to `console.log`/`console.error` too, so desktop debugging still works
 * the normal way.
 */
export class EventLog {
  private readonly entries: string[] = [];
  private readonly max: number;
  private readonly tag: string;

  constructor(tag: string, max = 8) {
    this.tag = tag;
    this.max = max;
  }

  log(message: string): void {
    this.push(message);
    console.log(`[${this.tag}] ${message}`);
  }

  error(message: string): void {
    this.push(`ERROR: ${message}`);
    console.error(`[${this.tag}] ${message}`);
  }

  private push(message: string): void {
    const time = new Date().toLocaleTimeString(undefined, {
      hour12: false,
      minute: "2-digit",
      second: "2-digit",
    });
    this.entries.push(`${time} ${message}`);
    if (this.entries.length > this.max) this.entries.shift();
  }

  /** Most recent first — matches how you'd want to read a live log. */
  recent(): string[] {
    return [...this.entries].reverse();
  }
}
