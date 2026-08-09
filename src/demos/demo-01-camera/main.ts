import { CameraService, CameraError } from "../../core/camera/CameraService";
import { MetricsService } from "../../core/metrics/MetricsService";
import { DebugOverlay } from "../../core/metrics/DebugOverlay";

/**
 * Demo 01 — Camera Lab (§10).
 *
 * Validates rear-camera access, start/stop lifecycle, and basic camera
 * observability. No tracking/rendering involved — this demo must work
 * standalone, before MindAR/A-Frame are introduced in Demo 02+.
 */

const camera = new CameraService();
const metrics = new MetricsService();
const debugOverlay = new DebugOverlay(metrics, "01 Camera");

metrics.set("currentDemo", "01-camera");
metrics.set("device", shortDeviceInfo());
metrics.set("cameraStatus", "idle");

const app = document.getElementById("app")!;

app.innerHTML = `
  <video class="camera-preview" autoplay playsinline muted hidden></video>
  <div class="demo-content">
    <div class="page">
      <div class="top-section">
        <div class="page-header">
          <a class="back-link" href="../../../index.html">&larr; WebAR Lab</a>
          <h1>Camera</h1>
        </div>
      </div>

      <div class="bottom-section">
        <div class="card">
          <div class="page-header" style="margin-bottom: 10px;">
            <span class="eyebrow">Camera Stream</span>
            <span class="status-pill" id="status-pill" data-state="idle">IDLE</span>
          </div>

          <div class="stat-grid">
            <div>
              <div class="stat-label">FPS</div>
              <div class="stat-value" id="stat-fps">—</div>
            </div>
            <div>
              <div class="stat-label">Resolution</div>
              <div class="stat-value" id="stat-resolution">—</div>
            </div>
            <div>
              <div class="stat-label">Facing</div>
              <div class="stat-value" id="stat-facing">—</div>
            </div>
            <div>
              <div class="stat-label">Start latency</div>
              <div class="stat-value" id="stat-latency">—</div>
            </div>
          </div>

          <div id="error-slot"></div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary" id="btn-start">Start</button>
          <button class="btn btn-danger" id="btn-stop" disabled>Stop</button>
        </div>
        <button class="btn" id="btn-export">Export metrics JSON</button>
      </div>
    </div>
  </div>
`;

const videoEl = app.querySelector<HTMLVideoElement>(".camera-preview")!;
const statusPill = app.querySelector<HTMLElement>("#status-pill")!;
const statFps = app.querySelector<HTMLElement>("#stat-fps")!;
const statResolution = app.querySelector<HTMLElement>("#stat-resolution")!;
const statFacing = app.querySelector<HTMLElement>("#stat-facing")!;
const statLatency = app.querySelector<HTMLElement>("#stat-latency")!;
const errorSlot = app.querySelector<HTMLElement>("#error-slot")!;
const btnStart = app.querySelector<HTMLButtonElement>("#btn-start")!;
const btnStop = app.querySelector<HTMLButtonElement>("#btn-stop")!;
const btnExport = app.querySelector<HTMLButtonElement>("#btn-export")!;

debugOverlay.mount();
metrics.startFpsLoop();

function setStatus(state: "idle" | "ok" | "pending" | "error", label: string): void {
  statusPill.dataset.state = state;
  statusPill.textContent = label;
  metrics.set("cameraStatus", label);
}

function showError(err: CameraError): void {
  errorSlot.innerHTML = `
    <div class="error-box">
      <span class="error-code">${err.code}</span>
      ${err.message}
    </div>
  `;
  metrics.set("cameraError", `${err.code}: ${err.message}`);
}

function clearError(): void {
  errorSlot.innerHTML = "";
  metrics.set("cameraError", null);
}

function refreshStats(): void {
  statFps.textContent = String(metrics.getFps());
  debugOverlay.refresh();
  requestAnimationFrame(refreshStats);
}
refreshStats();

btnStart.addEventListener("click", async () => {
  clearError();
  setStatus("pending", "STARTING");
  btnStart.disabled = true;

  try {
    const result = await camera.start(videoEl, "environment");

    videoEl.hidden = false;
    statResolution.textContent = `${result.width} x ${result.height}`;
    statFacing.textContent = result.facingMode;
    statLatency.textContent = `${result.startLatencyMs} ms`;

    metrics.set("resolution", `${result.width}x${result.height}`);
    metrics.set("facingMode", result.facingMode);
    metrics.set("startLatencyMs", result.startLatencyMs);

    setStatus("ok", "STREAMING");
    btnStop.disabled = false;
  } catch (err) {
    const cameraError =
      err instanceof CameraError
        ? err
        : new CameraError("unknown", err instanceof Error ? err.message : String(err));
    showError(cameraError);
    setStatus("error", "ERROR");
    btnStart.disabled = false;
  }
});

btnStop.addEventListener("click", () => {
  camera.stop();
  videoEl.hidden = true;

  statResolution.textContent = "—";
  statFacing.textContent = "—";
  metrics.set("resolution", null);
  metrics.set("facingMode", null);

  setStatus("idle", "IDLE");
  btnStart.disabled = false;
  btnStop.disabled = true;
});

btnExport.addEventListener("click", () => {
  metrics.exportJson("demo-01-camera");
});

function shortDeviceInfo(): string {
  const ua = navigator.userAgent;
  // Keep this short enough to fit the debug overlay; full UA is verbose.
  const match = ua.match(/\(([^)]+)\)/);
  return match ? match[1].split(";").slice(0, 2).join(";").trim() : ua.slice(0, 40);
}

// Stop the camera cleanly if the user navigates away mid-session.
window.addEventListener("pagehide", () => camera.stop());
