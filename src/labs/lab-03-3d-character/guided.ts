import { EvidenceRecorder } from "../../core/evidence/EvidenceRecorder";
import { GuidedSession, type GuidedStep } from "../../core/evidence/GuidedSession";
import { GuidedPanel } from "../../core/evidence/GuidedPanel";
import { buildReport, downloadReport } from "../../core/evidence/ReportBuilder";
import type { EvidenceSample, Primitive } from "../../core/evidence/types";
import type { MetricsService } from "../../core/metrics/MetricsService";
import type { EventLog } from "../../core/metrics/EventLog";
import type { JitterProbe } from "../../core/ar/JitterProbe";
import { parseTargetWidthCm, readPose, type Object3DLike } from "../../core/ar/TargetPose";

/**
 * Guided evidence session for LAB A3.
 *
 * Third lab on the same harness, and the first that makes the session
 * *act* rather than only observe: it swaps the model between steps so the
 * three asset weights are measured under conditions the operator did not
 * have to set up by hand. Comparing 16 KB against 833 KB is only
 * meaningful if nothing else changed between the two readings, and a
 * person clicking chips in whatever order they like cannot guarantee that.
 *
 * Jitter steps are gated on the accelerometer reporting the phone held
 * still. That gate is not politeness — JitterProbe rejects constant
 * velocity exactly but leaks on curved motion, so a reading taken during a
 * hand sweep is contaminated. Gating measures it only in the regime where
 * it means what it says.
 */

export interface ModelDescriptor {
  id: string;
  label: string;
  meta: string;
}

export interface GuidedContext {
  metrics: MetricsService;
  log: EventLog;
  jitter: JitterProbe;
  targetEl: HTMLElement & { object3D?: Object3DLike };
  isFound: () => boolean;
  getModels: () => ModelDescriptor[];
  loadModel: (id: string) => void;
  playClip: (name: string) => void;
  getClips: () => string[];
  ensureStarted: () => void;
}

/** Above this the phone is being moved and a jitter reading is not valid. */
const STILL_THRESHOLD = 0.55;

export function attachGuidedSession(context: GuidedContext): { start: () => Promise<void> } {
  const { metrics, log, jitter, targetEl } = context;

  let targetWidthCm: number | null = null;
  const triggered = new Set<string>();

  const recorder = new EvidenceRecorder({ fps: () => metrics.getFps() });

  recorder.addProbe("found", () => context.isFound());
  recorder.addProbe("distanceCm", () => {
    if (!context.isFound() || targetWidthCm === null) return null;
    const object3D = targetEl.object3D;
    const pose = object3D ? readPose(object3D) : null;
    return pose ? Math.round(pose.distanceUnits * targetWidthCm) : null;
  });
  recorder.addProbe("jitterRmsUnits", () => jitter.read()?.rmsUnits ?? null);
  recorder.addProbe("jitterPeakUnits", () => jitter.read()?.peakUnits ?? null);
  recorder.addProbe("jitterRmsMm", () => jitter.readMm(targetWidthCm)?.rmsMm ?? null);
  recorder.addProbe("modelLoadedVariant", () => metrics.get("modelLoadedVariant") ?? null);
  recorder.addProbe("modelLoadMs", () => metrics.get("modelLoadMs") ?? null);
  recorder.addProbe("modelTransferKb", () => metrics.get("modelTransferKb") ?? null);
  recorder.addProbe("modelTransferMs", () => metrics.get("modelTransferMs") ?? null);
  recorder.addProbe("modelCached", () => metrics.get("modelCached") ?? null);
  recorder.addProbe("clip", () => metrics.get("clip") ?? null);
  recorder.addProbe("clipCount", () => metrics.get("clipCount") ?? null);

  const session = new GuidedSession(buildSteps(context.getModels()), () => recorder.elapsedMs());

  /**
   * Steps that change the scene do it on entry, exactly once. Firing from
   * onChange rather than from the step definition keeps GuidedSession free
   * of side effects — it stays a pure state machine, which is what makes
   * it reusable across labs.
   */
  session.onChange((view) => {
    const answer = view.results.find((result) => result.id === "target-width");
    if (answer && targetWidthCm === null) {
      targetWidthCm = parseTargetWidthCm(answer.note);
      if (targetWidthCm !== null) log.log("target width: " + targetWidthCm + " cm");
    }

    const step = view.step;
    if (!step || triggered.has(step.id)) return;

    const loadMatch = step.id.match(/^load-(.+)$/);
    if (loadMatch) {
      triggered.add(step.id);
      recorder.event("model-switch", loadMatch[1]);
      context.loadModel(loadMatch[1]);
      return;
    }

    if (step.id === "clip-walk") {
      triggered.add(step.id);
      // Second clip if the model has one; a single-clip model is itself a
      // finding rather than a reason to stall the session.
      const clips = context.getClips();
      const target = clips[1] ?? clips[0];
      if (target) {
        context.playClip(target);
        recorder.event("clip-switch", target);
      }
    }
  });

  recorder.onSample((sample) => session.feed(sample));

  const panel = new GuidedPanel(session, {
    latestSample: () => recorder.getLatestSample(),
    contextFields: [
      "jitterRmsUnits",
      "jitterRmsMm",
      "distanceCm",
      "fps",
      "motion",
      "modelLoadedVariant",
      "clip",
    ],
    onFinish: (operatorNotes) => finish(operatorNotes),
  });
  panel.mount();

  function finish(operatorNotes: string): void {
    recorder.stop();
    const report = buildReport(recorder, session.getResults(), {
      lab: "lab-03-3d-character",
      labTitle: "LAB A3 — 3D Character",
      camera: describeCamera(),
      summary: {
        targetWidthCm,
        clipCount: metrics.get("clipCount") ?? null,
        motionSensorAvailable: recorder.motion.isAvailable(),
        // Without the accelerometer the stillness gate could not be
        // enforced, so every jitter figure in this report is weaker
        // evidence. Say so rather than let a reader assume otherwise.
        jitterGateEnforced: recorder.motion.isAvailable(),
      },
      operatorNotes,
    });
    downloadReport(report);
    log.log("guided session finished — report downloaded");
    document.body.classList.remove("guided-running");
  }

  function describeCamera(): Record<string, Primitive> {
    const video = document.querySelector("video");
    const track = (video?.srcObject as MediaStream | null)?.getVideoTracks()[0];
    const settings = track?.getSettings();
    return {
      resolution: settings ? settings.width + "x" + settings.height : null,
      facingMode: settings?.facingMode ?? null,
      frameRate: settings?.frameRate ? Math.round(settings.frameRate) : null,
      cameraOwner: "MindAR (mindar-image-system)",
    };
  }

  async function start(): Promise<void> {
    context.ensureStarted();
    document.body.classList.add("guided-running");

    recorder.start();
    const motionOk = await recorder.motion.request();
    recorder.event("motion-sensor", motionOk ? "available" : "unavailable");
    if (!motionOk) {
      log.log("sin acelerómetro: las mediciones de jitter no van a estar filtradas por quietud");
    }

    const video = document.querySelector("video");
    recorder.luminance.attach(video);

    session.start();
    log.log("guided session started");
  }

  return { start };
}

function buildSteps(models: ModelDescriptor[]): GuidedStep[] {
  const steps: GuidedStep[] = [
    {
      id: "target-width",
      label: "¿Cuánto mide el lado largo del target impreso?",
      fills: "Escala — convierte el jitter a milímetros",
      choices: ["5 cm", "9 cm", "15 cm", "21 cm"],
    },
    {
      id: "acquisition",
      label: "Apuntá al target hasta que aparezca el personaje.",
      fills: "El modelo se ancla al target y se ve",
      auto: {
        ok: (sample) => sample.found === true && sample.modelLoadedVariant !== null,
        hint: (sample) =>
          sample.found === true ? "enganchado — mantené" : "buscando el target…",
        holdMs: 1500,
        capture: ["modelLoadedVariant", "modelLoadMs", "distanceCm", "fps"],
      },
      timeoutMs: 60_000,
    },
    {
      id: "stand",
      label: "¿El personaje se ve parado sobre la tarjeta, del tamaño correcto y del lado derecho?",
      // Orientation cannot be checked from the pose: the model is upright
      // in its own frame either way. Only a person can see that it is
      // standing rather than lying flat or sunk into the card.
      fills: "§8 — orientación y escala por defecto",
      askNote: true,
    },
  ];

  for (const model of models) {
    steps.push({
      id: "load-" + model.id,
      label: "Cargando el modelo " + model.label + " (" + model.meta + ")… no muevas el teléfono.",
      fills: "Costo del asset — " + model.label,
      auto: {
        ok: (sample) => sample.modelLoadedVariant === model.id,
        hint: (sample) =>
          sample.modelLoadedVariant === model.id
            ? "cargado en " + fmt(sample.modelLoadMs) + " ms"
            : "descargando…",
        holdMs: 500,
        capture: ["modelLoadMs", "modelTransferKb", "modelTransferMs", "modelCached", "fps"],
      },
      timeoutMs: 45_000,
    });

    steps.push({
      id: "jitter-" + model.id,
      label: "Sostené el teléfono lo más quieto que puedas, apuntando al target.",
      fills: "Jitter con el modelo " + model.label,
      auto: {
        ok: (sample) =>
          sample.found === true &&
          typeof sample.jitterRmsUnits === "number" &&
          isStill(sample),
        hint: (sample) => jitterHint(sample),
        // Long hold: jitter needs a settled window, and a brief lucky
        // moment of stillness is not evidence of stability.
        holdMs: 4000,
        capture: ["jitterRmsUnits", "jitterPeakUnits", "jitterRmsMm", "fps", "distanceCm", "motion"],
      },
      timeoutMs: 60_000,
    });
  }

  steps.push(
    {
      id: "clip-walk",
      label: "Cambiando de animación. Mirá si el cambio es limpio o pega un salto.",
      fills: "Cambio de clip — §8",
      auto: {
        ok: (sample) => sample.found === true && sample.clip !== null,
        hint: (sample) => "clip actual: " + fmt(sample.clip) + " · " + fmt(sample.fps) + " fps",
        holdMs: 3000,
        capture: ["clip", "clipCount", "fps", "jitterRmsUnits"],
      },
      askNote: true,
    },
    {
      id: "animation-quality",
      label: "¿La animación se ve fluida, o va a tirones?",
      fills: "§8 — fluidez de la animación",
      askNote: true,
    },
    {
      id: "jitter-perceived",
      label: "¿El personaje se ve firme sobre la tarjeta, o tiembla, flota o se desfasa?",
      // The number and the perception are different findings: a jitter of
      // 0.4 mm may be invisible, or obvious, depending on the model. Both
      // go in the report so the product decision can use either.
      fills: "§8 — jitter percibido (contrastar con la medición)",
      askNote: true,
    },
    {
      id: "heat",
      label: "¿El teléfono se calentó o notaste que se puso lento durante la sesión?",
      fills: "§8 — costo térmico",
      askNote: true,
    },
  );

  return steps;
}

function isStill(sample: EvidenceSample): boolean {
  // No accelerometer: do not block the step, but the report records that
  // the gate was not enforced (see jitterGateEnforced).
  if (sample.motion === null) return true;
  return sample.motion < STILL_THRESHOLD;
}

function jitterHint(sample: EvidenceSample): string {
  if (sample.found !== true) return "tracking perdido — volvé a apuntar";
  if (!isStill(sample)) return "quieto… movimiento " + fmt(sample.motion) + " m/s²";
  if (typeof sample.jitterRmsUnits !== "number") return "midiendo…";
  const mm = sample.jitterRmsMm;
  return typeof mm === "number"
    ? "jitter " + mm + " mm RMS"
    : "jitter " + sample.jitterRmsUnits + " u RMS";
}

function fmt(value: Primitive): string {
  return value === null || value === undefined ? "—" : String(value);
}
