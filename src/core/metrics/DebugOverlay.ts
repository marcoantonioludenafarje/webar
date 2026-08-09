import type { MetricsService } from "./MetricsService";
import type { EventLog } from "./EventLog";

/**
 * DebugOverlay — reusable on-screen metrics readout (§8).
 *
 * Renders whatever is in MetricsService.toSnapshot() as key/value rows plus
 * a fixed "current demo" label. Demos should call `mount()` once and
 * `refresh()` on their own render loop (or a short interval). An optional
 * EventLog adds a scrolling list of recent debug events underneath — the
 * only way mobile testers (no DevTools) can see what's happening when
 * something fails silently.
 */
export class DebugOverlay {
  private readonly el: HTMLDivElement;
  private readonly metrics: MetricsService;
  private readonly demoLabel: string;
  private readonly eventLog?: EventLog;

  constructor(metrics: MetricsService, demoLabel: string, eventLog?: EventLog) {
    this.metrics = metrics;
    this.demoLabel = demoLabel;
    this.eventLog = eventLog;
    this.el = document.createElement("div");
    this.el.className = "debug-overlay";
  }

  mount(container: HTMLElement = document.body): void {
    container.appendChild(this.el);
    this.refresh();
  }

  unmount(): void {
    this.el.remove();
  }

  refresh(): void {
    const snapshot = this.metrics.toSnapshot();
    const rows = Object.entries(snapshot)
      .map(([key, value]) => {
        const label = camelToLabel(key);
        return `<div class="debug-row"><span class="debug-key">${label}</span><span>${formatValue(
          value,
        )}</span></div>`;
      })
      .join("");

    const logHtml = this.eventLog
      ? `<div class="debug-log">${this.eventLog
          .recent()
          .map((line) => `<div class="debug-log-row">${escapeHtml(line)}</div>`)
          .join("")}</div>`
      : "";

    this.el.innerHTML = `<div class="debug-title">DEBUG · ${this.demoLabel}</div>${rows}${logHtml}`;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function camelToLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
