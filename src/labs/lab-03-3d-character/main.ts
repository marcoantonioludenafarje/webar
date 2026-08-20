import { MetricsService } from "../../core/metrics/MetricsService";
import { DebugOverlay } from "../../core/metrics/DebugOverlay";
import { EventLog } from "../../core/metrics/EventLog";
import { JitterProbe } from "../../core/ar/JitterProbe";
import { ModelAnimator, readTransferStats } from "../../core/ar/ModelAnimator";
import type { Object3DLike } from "../../core/ar/TargetPose";
import { attachGuidedSession } from "./guided";

/**
 * LAB A3 — 3D Character (see ./README.md for the full write-up).
 *
 * Question: can an animated GLB stay visually stable and performant while
 * anchored to a tracked image?
 *
 * Three things are deliberately measured rather than eyeballed:
 *  - **jitter**, via JitterProbe, which separates tracker twitch from the
 *    operator's own hand movement (the naive variance does not),
 *  - **asset cost**, by shipping the same character at three tessellation
 *    levels so size is the only variable,
 *  - **load time**, split into transfer and parse using Resource Timing,
 *    because "the model takes 4 s" means different things depending which
 *    half dominates.
 *
 * Per PLAYBOOK §23.5 this lab is built without assuming A2's tracking
 * numbers: nothing here depends on tracking being stable at any given
 * distance — the point is to measure what it actually is with a character
 * on top.
 */

const MODELS = [
  { id: "small", file: "character-small.glb", label: "Small", meta: "16 KB · 420 tris" },
  { id: "medium", file: "character-medium.glb", label: "Medium", meta: "120 KB · 6.2k tris" },
  { id: "large", file: "character-large.glb", label: "Large", meta: "833 KB · 46.5k tris" },
];

const metrics = new MetricsService();
const log = new EventLog("lab-03");
const debugOverlay = new DebugOverlay(metrics, "A3 Character", log);
const jitter = new JitterProbe();
const animator = new ModelAnimator();

metrics.set("currentDemo", "lab-03-3d-character");
metrics.set("modelVariant", null);
metrics.set("clip", null);

const app = document.getElementById("app")!;

app.innerHTML = `
  <div class="demo-content">
    <div class="page">
      <div class="top-section">
        <div class="page-header">
          <a class="back-link" href="../../../index.html">&larr; WebAR Lab</a>
          <h1>Character</h1>
        </div>
      </div>

      <div class="bottom-section">
        <div class="card">
          <div class="page-header" style="margin-bottom: 10px;">
            <span class="eyebrow">3D Character</span>
            <span class="status-pill" id="status-pill" data-state="idle">LOADING AR</span>
          </div>

          <div class="stat-grid">
            <div>
              <div class="stat-label">Load</div>
              <div class="stat-value" id="stat-load">—</div>
            </div>
            <div>
              <div class="stat-label">Transfer</div>
              <div class="stat-value" id="stat-transfer">—</div>
            </div>
            <div>
              <div class="stat-label">Jitter RMS</div>
              <div class="stat-value" id="stat-jitter">—</div>
            </div>
            <div>
              <div class="stat-label">FPS</div>
              <div class="stat-value" id="stat-fps">—</div>
            </div>
          </div>

          <p class="target-hint">
            Apuntá al mismo target de LAB A2
            (<code>public/targets/lab-02-image-tracking/card.png</code>). El
            personaje se para sobre la tarjeta.
          </p>

          <div id="error-slot"></div>
        </div>

        <div class="card">
          <span class="eyebrow">Modelo</span>
          <div class="chip-row" id="model-chips"></div>

          <span class="eyebrow">Animación</span>
          <div class="chip-row" id="clip-chips"></div>

          <div class="control-row">
            <label for="ctl-scale">Escala</label>
            <input type="range" id="ctl-scale" min="0.2" max="3" step="0.05" value="1" />
            <span class="control-value" id="val-scale">1.00</span>
          </div>
          <div class="control-row">
            <label for="ctl-y">Altura</label>
            <input type="range" id="ctl-y" min="-1" max="1" step="0.02" value="0" />
            <span class="control-value" id="val-y">0.00</span>
          </div>
          <div class="control-row">
            <label for="ctl-rot">Giro</label>
            <input type="range" id="ctl-rot" min="-180" max="180" step="5" value="0" />
            <span class="control-value" id="val-rot">0°</span>
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary" id="btn-start" disabled>Loading…</button>
          <button class="btn btn-danger" id="btn-stop" disabled>Stop</button>
        </div>
        <button class="btn btn-primary" id="btn-guided">Sesion guiada + reporte</button>
      </div>
    </div>
  </div>
`;

const statusPill = app.querySelector<HTMLElement>("#status-pill")!;
const statLoad = app.querySelector<HTMLElement>("#stat-load")!;
const statTransfer = app.querySelector<HTMLElement>("#stat-transfer")!;
const statJitter = app.querySelector<HTMLElement>("#stat-jitter")!;
const statFps = app.querySelector<HTMLElement>("#stat-fps")!;
const errorSlot = app.querySelector<HTMLElement>("#error-slot")!;
const modelChips = app.querySelector<HTMLElement>("#model-chips")!;
const clipChips = app.querySelector<HTMLElement>("#clip-chips")!;
const btnStart = app.querySelector<HTMLButtonElement>("#btn-start")!;
const btnStop = app.querySelector<HTMLButtonElement>("#btn-stop")!;
const btnGuided = app.querySelector<HTMLButtonElement>("#btn-guided")!;

const sceneEl = document.querySelector<
  HTMLElement & { systems: Record<string, any>; hasLoaded: boolean }
>("#ar-scene")!;
const targetEl = document.querySelector<HTMLElement & { object3D?: Object3DLike }>("#target")!;
const wrapperEl = document.querySelector<HTMLElement>("#model-wrapper")!;
const characterEl = document.querySelector<HTMLElement>("#character")!;

log.log("script loaded, waiting for a-scene…");
debugOverlay.mount();
metrics.startFpsLoop();

let isFound = false;
let loadStartedAt = 0;
let currentModel: string | null = null;

// ── Estado y errores ───────────────────────────────────────────────────

function setStatus(state: "idle" | "ok" | "pending" | "error", label: string): void {
  statusPill.dataset.state = state;
  statusPill.textContent = label;
  metrics.set("trackingStatus", label);
}

function showError(message: string): void {
  errorSlot.innerHTML = `
    <div class="error-box">
      <span class="error-code">lab-03</span>
      ${message}
    </div>
  `;
  metrics.set("labError", message);
  log.error(message);
}

// ── Modelos ────────────────────────────────────────────────────────────

modelChips.innerHTML = MODELS.map(
  (model) => `
    <button class="chip" data-model="${model.id}" aria-pressed="false">
      ${model.label}<span class="chip-meta">${model.meta}</span>
    </button>`,
).join("");

modelChips.addEventListener("click", (event) => {
  const chip = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-model]");
  if (chip) loadModel(chip.dataset.model!);
});

function loadModel(id: string): void {
  const model = MODELS.find((candidate) => candidate.id === id);
  if (!model) return;

  currentModel = id;
  loadStartedAt = performance.now();
  statLoad.textContent = "…";
  statTransfer.textContent = "…";
  metrics.set("modelVariant", id);

  for (const chip of modelChips.querySelectorAll<HTMLElement>("button[data-model]")) {
    chip.setAttribute("aria-pressed", String(chip.dataset.model === id));
  }

  animator.detach();
  clipChips.innerHTML = "";
  // Cleared here and set again only once the model is actually in the
  // scene: modelVariant flips at request time, so a guided step waiting on
  // it would pass before the download even started.
  metrics.set("modelLoadedVariant", null);
  log.log("loading " + model.file);
  characterEl.setAttribute("gltf-model", "url(../../../models/" + model.file + ")");
}

characterEl.addEventListener("model-loaded", (event) => {
  const loadMs = Math.round(performance.now() - loadStartedAt);
  const model = (event as CustomEvent).detail?.model;

  statLoad.textContent = loadMs + " ms";
  metrics.set("modelLoadMs", loadMs);

  const file = MODELS.find((candidate) => candidate.id === currentModel)?.file ?? "";
  const transfer = readTransferStats(file);
  statTransfer.textContent = transfer.transferKb === null
    ? "—"
    : transfer.cached
      ? "cache"
      : transfer.transferKb + " KB / " + transfer.durationMs + " ms";
  metrics.set("modelTransferKb", transfer.transferKb);
  metrics.set("modelTransferMs", transfer.durationMs);
  metrics.set("modelCached", transfer.cached);

  const clips = animator.attach(model);
  metrics.set("clipCount", clips.length);
  metrics.set("modelLoadedVariant", currentModel);
  log.log("model loaded in " + loadMs + " ms · clips: " + (clips.join(", ") || "ninguno"));

  if (clips.length === 0) {
    showError("El modelo cargó pero no expone clips de animación — revisar el GLB.");
    return;
  }

  clipChips.innerHTML = clips
    .map((clip) => `<button class="chip" data-clip="${clip}" aria-pressed="false">${clip}</button>`)
    .join("");
  playClip(clips[0]);
});

characterEl.addEventListener("model-error", () => {
  showError("No se pudo cargar el modelo. Revisar la ruta en public/models/.");
});

clipChips.addEventListener("click", (event) => {
  const chip = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-clip]");
  if (chip) playClip(chip.dataset.clip!);
});

function playClip(name: string): void {
  if (!animator.play(name)) return;
  metrics.set("clip", name);
  for (const chip of clipChips.querySelectorAll<HTMLElement>("button[data-clip]")) {
    chip.setAttribute("aria-pressed", String(chip.dataset.clip === name));
  }
}

// ── Controles de ajuste ────────────────────────────────────────────────

bindSlider("#ctl-scale", "#val-scale", (value) => {
  wrapperEl.setAttribute("scale", value + " " + value + " " + value);
  metrics.set("modelScale", value);
  return value.toFixed(2);
});

bindSlider("#ctl-y", "#val-y", (value) => {
  wrapperEl.setAttribute("position", "0 " + value + " 0");
  metrics.set("modelY", value);
  return value.toFixed(2);
});

bindSlider("#ctl-rot", "#val-rot", (value) => {
  wrapperEl.setAttribute("rotation", "0 " + value + " 0");
  metrics.set("modelRotationY", value);
  return value + "°";
});

function bindSlider(inputId: string, valueId: string, apply: (value: number) => string): void {
  const input = app.querySelector<HTMLInputElement>(inputId)!;
  const readout = app.querySelector<HTMLElement>(valueId)!;
  input.addEventListener("input", () => {
    readout.textContent = apply(Number(input.value));
  });
}

// ── Ciclo de render ────────────────────────────────────────────────────

/**
 * Jitter and animation both live at frame rate, so both are driven from
 * rAF rather than the evidence recorder's slower sampling tick.
 */
function frame(): void {
  animator.update();
  if (isFound) jitter.sample(targetEl.object3D);

  const reading = jitter.read();
  statJitter.textContent = reading ? reading.rmsUnits.toFixed(4) + " u" : "—";
  if (reading) metrics.set("jitterRmsUnits", reading.rmsUnits);

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
  // Start on the smallest model: the operator should see something work
  // before deciding to pay for a heavier one.
  loadModel("small");
}

if (sceneEl.hasLoaded) {
  onSceneLoaded();
} else {
  sceneEl.addEventListener("loaded", onSceneLoaded, { once: true });
}

sceneEl.addEventListener("arReady", () => {
  log.log("arReady — camera + tracking pipeline initialized");
  setStatus("pending", "SEARCHING");
});

sceneEl.addEventListener("arError", () => {
  showError("MindAR no pudo iniciar cámara/tracking. Revisar el permiso de cámara y recargar.");
  setStatus("error", "ERROR");
  btnStart.disabled = false;
  btnStop.disabled = true;
});

targetEl.addEventListener("targetFound", () => {
  isFound = true;
  setStatus("ok", "TARGET FOUND");
  log.log("targetFound");
});

targetEl.addEventListener("targetLost", () => {
  isFound = false;
  setStatus("pending", "SEARCHING");
  // Without this, the gap across a loss reads as one enormous jump and
  // poisons the jitter window for the next second.
  jitter.reset();
  log.log("targetLost");
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
  jitter.reset();
  setStatus("idle", "IDLE");
  btnStart.disabled = false;
  btnStop.disabled = true;
});

// ── Sesión guiada ──────────────────────────────────────────────────────

const guided = attachGuidedSession({
  metrics,
  log,
  jitter,
  targetEl,
  isFound: () => isFound,
  getModels: () => MODELS,
  loadModel,
  playClip,
  getClips: () => animator.getClips(),
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
    // scene may not be initialized yet; nothing to clean up
  }
});
