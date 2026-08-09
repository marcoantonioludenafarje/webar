import { MetricsService } from "../../core/metrics/MetricsService";
import { DebugOverlay } from "../../core/metrics/DebugOverlay";
import { EventLog } from "../../core/metrics/EventLog";

/**
 * Demo 02 — Image Tracking Lab (§11).
 *
 * Validates MindAR image-target detection/tracking. Reuses MetricsService
 * and DebugOverlay as-is from Demo 01 (their second real usage — the
 * abstraction earns its keep per §5.2). Camera access here is owned by
 * MindAR internally, so CameraService is intentionally not involved.
 *
 * Tracking-specific event wiring (targetFound/targetLost, start/stop of the
 * mindar-image system) stays local to this demo rather than a premature
 * "TrackingService" — it becomes a shared module if/when a second demo
 * needs the same wiring (§5.2).
 *
 * EventLog is new here (core/metrics, alongside MetricsService/DebugOverlay)
 * because mobile testers have no DevTools console — silent failures during
 * AR init are otherwise invisible on-device. See DebugOverlay's log panel.
 */

type TrackingState = "idle" | "loading" | "searching" | "found" | "error";

const metrics = new MetricsService();
const log = new EventLog("demo-02");
const debugOverlay = new DebugOverlay(metrics, "02 Tracking", log);

metrics.set("currentDemo", "02-tracking");
metrics.set("targetFoundCount", 0);
metrics.set("targetLostCount", 0);

const app = document.getElementById("app")!;

app.innerHTML = `
  <div class="demo-content">
    <div class="page">
      <div class="top-section">
        <div class="page-header">
          <a class="back-link" href="../../../index.html">&larr; WebAR Lab</a>
          <h1>Tracking</h1>
        </div>
      </div>

      <div class="bottom-section">
        <div class="card">
          <div class="page-header" style="margin-bottom: 10px;">
            <span class="eyebrow">Image Tracking</span>
            <span class="status-pill" id="status-pill" data-state="idle">LOADING AR</span>
          </div>

          <div class="stat-grid">
            <div>
              <div class="stat-label">Target Found</div>
              <div class="stat-value" id="stat-found">0</div>
            </div>
            <div>
              <div class="stat-label">Target Lost</div>
              <div class="stat-value" id="stat-lost">0</div>
            </div>
            <div>
              <div class="stat-label">Acquisition</div>
              <div class="stat-value" id="stat-acquisition">—</div>
            </div>
            <div>
              <div class="stat-label">Last Recovery</div>
              <div class="stat-value" id="stat-recovery">—</div>
            </div>
          </div>

          <p class="target-hint">
            Point the camera at the MindAR sample card
            (<code>public/targets/demo-02/card.png</code> — print it or
            display it on another screen). Swap in your own target later by
            compiling one at
            <a href="https://hiukim.github.io/mind-ar-js-doc/tools/compile" target="_blank" rel="noopener">
              hiukim.github.io/mind-ar-js-doc/tools/compile
            </a>
            and replacing <code>card.mind</code>.
          </p>

          <div id="error-slot"></div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary" id="btn-start" disabled>Loading…</button>
          <button class="btn btn-danger" id="btn-stop" disabled>Stop</button>
        </div>
        <button class="btn" id="btn-export">Export metrics JSON</button>
      </div>
    </div>
  </div>
`;

const statusPill = app.querySelector<HTMLElement>("#status-pill")!;
const statFound = app.querySelector<HTMLElement>("#stat-found")!;
const statLost = app.querySelector<HTMLElement>("#stat-lost")!;
const statAcquisition = app.querySelector<HTMLElement>("#stat-acquisition")!;
const statRecovery = app.querySelector<HTMLElement>("#stat-recovery")!;
const errorSlot = app.querySelector<HTMLElement>("#error-slot")!;
const btnStart = app.querySelector<HTMLButtonElement>("#btn-start")!;
const btnStop = app.querySelector<HTMLButtonElement>("#btn-stop")!;
const btnExport = app.querySelector<HTMLButtonElement>("#btn-export")!;

const sceneEl = document.querySelector<HTMLElement & { systems: Record<string, any>; hasLoaded: boolean }>(
  "#ar-scene",
)!;
const targetEl = document.querySelector<HTMLElement>("#target")!;

log.log("script loaded, waiting for a-scene…");
debugOverlay.mount();
metrics.startFpsLoop();

let foundCount = 0;
let lostCount = 0;
let searchStartedAt = 0;
let lostAt = 0;
let acquiredOnce = false;

function setStatus(state: TrackingState, label: string): void {
  const pillState =
    state === "found" ? "ok" : state === "error" ? "error" : state === "searching" ? "pending" : "idle";
  statusPill.dataset.state = pillState;
  statusPill.textContent = label;
  metrics.set("trackingStatus", label);
}

function showError(message: string): void {
  errorSlot.innerHTML = `
    <div class="error-box">
      <span class="error-code">ar-error</span>
      ${message}
    </div>
  `;
  metrics.set("trackingError", message);
  log.error(message);
}

function clearError(): void {
  errorSlot.innerHTML = "";
  metrics.set("trackingError", null);
}

function refreshStats(): void {
  debugOverlay.refresh();
  requestAnimationFrame(refreshStats);
}
refreshStats();

// Gate Start on the scene actually being ready — clicking before A-Frame has
// registered the mindar-image system throws, and on a phone with no
// console that failure was previously invisible.
function onSceneLoaded(): void {
  log.log("a-scene loaded, mindar-image system ready");
  btnStart.disabled = false;
  btnStart.textContent = "Start";
  setStatus("idle", "IDLE");
}

if (sceneEl.hasLoaded) {
  onSceneLoaded();
} else {
  sceneEl.addEventListener("loaded", onSceneLoaded, { once: true });
}

sceneEl.addEventListener("arReady", () => {
  log.log("arReady — camera + tracking pipeline initialized");
  clearError();
  searchStartedAt = performance.now();
  setStatus("searching", "SEARCHING");
});

sceneEl.addEventListener("arError", (event) => {
  const detail = (event as CustomEvent).detail;
  const detailText = detail ? ` (${JSON.stringify(detail)})` : "";
  showError(
    `MindAR failed to start the camera/tracking pipeline${detailText}. Check camera permission and reload.`,
  );
  setStatus("error", "ERROR");
  btnStart.disabled = false;
  btnStart.textContent = "Start";
  btnStop.disabled = true;
});

targetEl.addEventListener("targetFound", () => {
  const now = performance.now();
  foundCount += 1;
  statFound.textContent = String(foundCount);
  metrics.set("targetFoundCount", foundCount);
  log.log(`targetFound (#${foundCount})`);

  if (!acquiredOnce) {
    acquiredOnce = true;
    const acquisitionMs = Math.round(now - searchStartedAt);
    statAcquisition.textContent = `${acquisitionMs} ms`;
    metrics.set("acquisitionMs", acquisitionMs);
  } else if (lostAt > 0) {
    const recoveryMs = Math.round(now - lostAt);
    statRecovery.textContent = `${recoveryMs} ms`;
    metrics.set("lastRecoveryMs", recoveryMs);
  }

  setStatus("found", "TARGET FOUND");
});

targetEl.addEventListener("targetLost", () => {
  lostAt = performance.now();
  lostCount += 1;
  statLost.textContent = String(lostCount);
  metrics.set("targetLostCount", lostCount);
  log.log(`targetLost (#${lostCount})`);

  setStatus("searching", "SEARCHING");
});

btnStart.addEventListener("click", () => {
  clearError();
  btnStart.disabled = true;
  setStatus("loading", "STARTING");
  log.log("Start clicked — requesting camera via mindar-image-system.start()");

  foundCount = 0;
  lostCount = 0;
  acquiredOnce = false;
  lostAt = 0;
  statFound.textContent = "0";
  statLost.textContent = "0";
  statAcquisition.textContent = "—";
  statRecovery.textContent = "—";

  try {
    sceneEl.systems["mindar-image-system"].start();
    btnStop.disabled = false;
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
    setStatus("error", "ERROR");
    btnStart.disabled = false;
    btnStart.textContent = "Start";
  }
});

btnStop.addEventListener("click", () => {
  log.log("Stop clicked");
  sceneEl.systems["mindar-image-system"].stop();
  setStatus("idle", "IDLE");
  btnStart.disabled = false;
  btnStart.textContent = "Start";
  btnStop.disabled = true;
});

btnExport.addEventListener("click", () => {
  metrics.exportJson("demo-02-tracking");
});

// Stop tracking cleanly if the user navigates away mid-session.
window.addEventListener("pagehide", () => {
  try {
    sceneEl.systems["mindar-image-system"]?.stop();
  } catch {
    // scene may not be initialized yet; nothing to clean up
  }
});
