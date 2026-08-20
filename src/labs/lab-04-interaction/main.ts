import { MetricsService } from "../../core/metrics/MetricsService";
import { DebugOverlay } from "../../core/metrics/DebugOverlay";
import { EventLog } from "../../core/metrics/EventLog";
import { ModelAnimator } from "../../core/ar/ModelAnimator";
import { ScreenRaycaster, summariseTaps, type TapResult } from "../../core/ar/ScreenRaycaster";
import type { Object3DLike } from "../../core/ar/TargetPose";
import { attachGuidedSession } from "./guided";

/**
 * LAB A4 — Interaction (see ./README.md).
 *
 * Question: can an AR object behave like a UI element, not just a
 * decoration?
 *
 * The measurement that matters is not "do taps work" — it is *how close
 * you have to tap* before the object responds. So every tap is recorded
 * with its hit/miss result, its distance in pixels from where the
 * character was actually drawn, and its input-to-render latency. A hit
 * rate alone would say interaction is unreliable; the miss distances say
 * whether the fix is a bigger hit area or something deeper.
 *
 * Uses the small model throughout: A3 exists to measure asset cost, and
 * varying it here would confound interaction numbers with render load.
 */

const MODEL_FILE = "character-small.glb";
/** How long the reaction clip plays before returning to idle. */
const REACTION_MS = 1200;

const metrics = new MetricsService();
const log = new EventLog("lab-04");
const debugOverlay = new DebugOverlay(metrics, "A4 Interaction", log);
const animator = new ModelAnimator();
const raycaster = new ScreenRaycaster();

metrics.set("currentDemo", "lab-04-interaction");
metrics.set("taps", 0);
metrics.set("hits", 0);

const app = document.getElementById("app")!;

app.innerHTML = `
  <div class="score-badge" id="score" data-pulse="false">0</div>
  <div class="demo-content">
    <div class="page">
      <div class="top-section">
        <div class="page-header">
          <a class="back-link" href="../../../index.html">&larr; WebAR Lab</a>
          <h1>Interaction</h1>
        </div>
      </div>

      <div class="bottom-section">
        <div class="card">
          <div class="page-header" style="margin-bottom: 10px;">
            <span class="eyebrow">Tap to interact</span>
            <span class="status-pill" id="status-pill" data-state="idle">LOADING AR</span>
          </div>

          <div class="stat-grid">
            <div>
              <div class="stat-label">Taps</div>
              <div class="stat-value" id="stat-taps">0</div>
            </div>
            <div>
              <div class="stat-label">Hit rate</div>
              <div class="stat-value" id="stat-hitrate">—</div>
            </div>
            <div>
              <div class="stat-label">Latencia (mediana)</div>
              <div class="stat-value" id="stat-latency">—</div>
            </div>
            <div>
              <div class="stat-label">FPS</div>
              <div class="stat-value" id="stat-fps">—</div>
            </div>
          </div>

          <p class="target-hint">
            Apuntá al target de LAB A2 y tocá el personaje. Cada toque deja
            un punto: <span style="color: var(--accent)">verde</span> acertó,
            <span style="color: var(--danger)">rojo</span> falló.
          </p>

          <div id="error-slot"></div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary" id="btn-start" disabled>Loading…</button>
          <button class="btn btn-danger" id="btn-stop" disabled>Stop</button>
        </div>
        <div class="btn-row">
          <button class="btn" id="btn-reset">Reiniciar conteo</button>
        </div>
        <button class="btn btn-primary" id="btn-guided">Sesion guiada + reporte</button>
      </div>
    </div>
  </div>
`;

const statusPill = app.querySelector<HTMLElement>("#status-pill")!;
const statTaps = app.querySelector<HTMLElement>("#stat-taps")!;
const statHitRate = app.querySelector<HTMLElement>("#stat-hitrate")!;
const statLatency = app.querySelector<HTMLElement>("#stat-latency")!;
const statFps = app.querySelector<HTMLElement>("#stat-fps")!;
const scoreEl = app.querySelector<HTMLElement>("#score")!;
const errorSlot = app.querySelector<HTMLElement>("#error-slot")!;
const btnStart = app.querySelector<HTMLButtonElement>("#btn-start")!;
const btnStop = app.querySelector<HTMLButtonElement>("#btn-stop")!;
const btnReset = app.querySelector<HTMLButtonElement>("#btn-reset")!;
const btnGuided = app.querySelector<HTMLButtonElement>("#btn-guided")!;

const sceneEl = document.querySelector<
  HTMLElement & { systems: Record<string, any>; camera: unknown; hasLoaded: boolean }
>("#ar-scene")!;
const targetEl = document.querySelector<HTMLElement & { object3D?: Object3DLike }>("#target")!;
const wrapperEl = document.querySelector<HTMLElement>("#model-wrapper")!;
const characterEl = document.querySelector<
  HTMLElement & { object3D?: { matrixWorld: unknown; visible: boolean } }
>("#character")!;

log.log("script loaded, waiting for a-scene…");
debugOverlay.mount();
metrics.startFpsLoop();

let isFound = false;
let score = 0;
let reactionTimer: number | null = null;
const taps: Array<TapResult & { latencyMs: number | null; found: boolean }> = [];

// ── Estado ─────────────────────────────────────────────────────────────

function setStatus(state: "idle" | "ok" | "pending" | "error", label: string): void {
  statusPill.dataset.state = state;
  statusPill.textContent = label;
  metrics.set("trackingStatus", label);
}

function showError(message: string): void {
  errorSlot.innerHTML = `
    <div class="error-box">
      <span class="error-code">lab-04</span>
      ${message}
    </div>
  `;
  metrics.set("labError", message);
  log.error(message);
}

// ── Toques ─────────────────────────────────────────────────────────────

/**
 * Only taps that land on the AR canvas count.
 *
 * The overlay is pointer-events: none (see style.css), so anything the
 * operator aims at the character reaches the canvas, and anything aimed at
 * a button never does. Without this the hit rate would silently count
 * button presses as missed taps.
 */
window.addEventListener("pointerdown", (event) => {
  if (!(event.target instanceof HTMLCanvasElement)) return;
  handleTap(event);
});

function handleTap(event: PointerEvent): void {
  const result = raycaster.test(
    event.clientX,
    event.clientY,
    characterEl.object3D,
    sceneEl.camera,
  );
  if (!result) return;

  // Only react when the ray actually hit *and* the target is tracked: a
  // hit while the anchor is stale is not an interaction the user could
  // have intended.
  const reacted = result.hit && isFound;
  if (reacted) react();

  dropMarker(event.clientX, event.clientY, reacted);

  // Latency is measured to the first frame after the reaction is applied.
  // It therefore covers input dispatch, hit test and our own work — but
  // not compositing or display, which the page cannot observe. Reported
  // as such in the README so nobody reads it as glass-to-glass.
  requestAnimationFrame(() => {
    const latencyMs = Math.round(performance.now() - event.timeStamp);
    taps.push({
      ...result,
      latencyMs: Number.isFinite(latencyMs) && latencyMs >= 0 ? latencyMs : null,
      found: isFound,
    });
    refreshTapStats();
    log.log(
      (reacted ? "hit" : "miss") +
        " @" +
        (result.pixelDistance === null ? "?" : result.pixelDistance + "px") +
        " · " +
        latencyMs +
        " ms",
    );
  });
}

function react(): void {
  score += 1;
  scoreEl.textContent = String(score);
  scoreEl.dataset.pulse = "true";

  const clips = animator.getClips();
  const reaction = clips[1] ?? clips[0];
  if (reaction) animator.play(reaction, 0.1);

  // A short haptic is the clearest confirmation on a phone held at arm's
  // length, where the character may be small on screen. Absent on iOS
  // Safari, which is itself worth knowing.
  navigator.vibrate?.(20);

  if (reactionTimer !== null) window.clearTimeout(reactionTimer);
  reactionTimer = window.setTimeout(() => {
    scoreEl.dataset.pulse = "false";
    if (clips[0]) animator.play(clips[0], 0.2);
  }, REACTION_MS);
}

function dropMarker(x: number, y: number, hit: boolean): void {
  const marker = document.createElement("div");
  marker.className = "tap-marker";
  marker.dataset.hit = String(hit);
  marker.style.left = x + "px";
  marker.style.top = y + "px";
  document.body.appendChild(marker);
  window.setTimeout(() => marker.remove(), 1500);
}

function refreshTapStats(): void {
  const summary = summariseTaps(taps);
  statTaps.textContent = String(summary.taps);
  statHitRate.textContent = summary.taps === 0 ? "—" : summary.hitRatePct + "%";
  statLatency.textContent =
    summary.medianLatencyMs === null ? "—" : summary.medianLatencyMs + " ms";

  metrics.set("taps", summary.taps);
  metrics.set("hits", summary.hits);
  metrics.set("hitRatePct", summary.hitRatePct);
  metrics.set("medianLatencyMs", summary.medianLatencyMs);
  metrics.set("closestMissPx", summary.closestMissPx);
}

btnReset.addEventListener("click", () => {
  taps.length = 0;
  score = 0;
  scoreEl.textContent = "0";
  refreshTapStats();
  log.log("conteo reiniciado");
});

// ── Ciclo de render ────────────────────────────────────────────────────

function frame(): void {
  animator.update();
  statFps.textContent = String(metrics.getFps());
  debugOverlay.refresh();
  requestAnimationFrame(frame);
}
frame();

// ── Ciclo de vida de AR ────────────────────────────────────────────────

function onSceneLoaded(): void {
  log.log("a-scene loaded, mindar-image system ready");
  btnStart.disabled = false;
  btnStart.textContent = "Start";
  setStatus("idle", "IDLE");

  if (!raycaster.isAvailable()) {
    showError("No se encontró THREE (AFRAME.THREE). El hit-test no va a funcionar.");
  }
  characterEl.setAttribute("gltf-model", "url(../../../models/" + MODEL_FILE + ")");
}

if (sceneEl.hasLoaded) {
  onSceneLoaded();
} else {
  sceneEl.addEventListener("loaded", onSceneLoaded, { once: true });
}

characterEl.addEventListener("model-loaded", (event) => {
  const clips = animator.attach((event as CustomEvent).detail?.model);
  metrics.set("clipCount", clips.length);
  log.log("model loaded · clips: " + (clips.join(", ") || "ninguno"));
  if (clips[0]) animator.play(clips[0]);
});

characterEl.addEventListener("model-error", () => {
  showError("No se pudo cargar el modelo desde public/models/.");
});

sceneEl.addEventListener("arReady", () => {
  log.log("arReady");
  setStatus("pending", "SEARCHING");
});

sceneEl.addEventListener("arError", () => {
  showError("MindAR no pudo iniciar cámara/tracking. Revisar permiso y recargar.");
  setStatus("error", "ERROR");
  btnStart.disabled = false;
  btnStop.disabled = true;
});

targetEl.addEventListener("targetFound", () => {
  isFound = true;
  setStatus("ok", "TARGET FOUND");
});

targetEl.addEventListener("targetLost", () => {
  isFound = false;
  setStatus("pending", "SEARCHING");
});

btnStart.addEventListener("click", () => {
  btnStart.disabled = true;
  setStatus("pending", "STARTING");
  try {
    sceneEl.systems["mindar-image-system"].start();
    btnStop.disabled = false;
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
    setStatus("error", "ERROR");
    btnStart.disabled = false;
  }
});

btnStop.addEventListener("click", () => {
  sceneEl.systems["mindar-image-system"].stop();
  isFound = false;
  setStatus("idle", "IDLE");
  btnStart.disabled = false;
  btnStop.disabled = true;
});

// ── Sesión guiada ──────────────────────────────────────────────────────

const guided = attachGuidedSession({
  metrics,
  log,
  targetEl,
  wrapperEl,
  isFound: () => isFound,
  getTaps: () => taps,
  resetTaps: () => btnReset.click(),
  ensureStarted: () => {
    if (btnStop.disabled) btnStart.click();
  },
});

btnGuided.addEventListener("click", async () => {
  btnGuided.disabled = true;
  btnGuided.textContent = "Sesion en curso";
  try {
    await guided.start();
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
    btnGuided.disabled = false;
    btnGuided.textContent = "Sesion guiada + reporte";
  }
});

window.addEventListener("pagehide", () => {
  try {
    sceneEl.systems["mindar-image-system"]?.stop();
  } catch {
    // scene may not be initialized yet
  }
});
