import { EvidenceRecorder } from "../../core/evidence/EvidenceRecorder";
import { GuidedSession, type GuidedStep } from "../../core/evidence/GuidedSession";
import { GuidedPanel } from "../../core/evidence/GuidedPanel";
import { buildReport, downloadReport } from "../../core/evidence/ReportBuilder";
import type { EvidenceSample, Primitive } from "../../core/evidence/types";
import type { MetricsService } from "../../core/metrics/MetricsService";
import type { EventLog } from "../../core/metrics/EventLog";
import { parseTargetWidthCm, readPose, type Object3DLike } from "./pose";

/**
 * Guided evidence session for LAB A2.
 *
 * Wires the generic harness (src/core/evidence/) to this lab's physical
 * test matrix. Kept in its own module and attached additively — it adds
 * listeners and probes but never modifies the tracking logic in main.ts,
 * so a bug here can't take the lab itself down.
 *
 * Eight of the README's eleven matrix rows are decided by the browser:
 * distance and angle come from the tracked pose, lighting from frame
 * luminance, camera motion from the accelerometer. The remaining three —
 * partial occlusion, target-in-motion, and subjective quality — are asked,
 * because no sensor here can distinguish "I covered half the card" from
 * "the card left the frame", or tell whether the render looked acceptable
 * to a person.
 */

export interface GuidedContext {
  metrics: MetricsService;
  log: EventLog;
  sceneEl: HTMLElement;
  targetEl: HTMLElement & { object3D?: Object3DLike };
  /** Called so the lab can start AR if the operator hasn't already. */
  ensureStarted: () => void;
}

/** Tolerances are generous on purpose: this is a person holding a phone. */
const DISTANCE_STEPS = [
  { id: "dist-20", cm: 20, min: 14, max: 28 },
  { id: "dist-50", cm: 50, min: 38, max: 65 },
  { id: "dist-100", cm: 100, min: 80, max: 130 },
];

const ANGLE_STEPS = [
  { id: "angle-front", label: "de frente", min: 0, max: 15 },
  { id: "angle-30", label: "unos 30°", min: 22, max: 45 },
  { id: "angle-60", label: "unos 60°", min: 50, max: 75 },
];

export function attachGuidedSession(context: GuidedContext): {
  start: () => Promise<void>;
} {
  const { metrics, log, targetEl } = context;

  let isFound = false;
  let targetWidthCm: number | null = null;

  const recorder = new EvidenceRecorder({ fps: () => metrics.getFps() });

  // Additive listeners — main.ts keeps owning the counters and the UI.
  targetEl.addEventListener("targetFound", () => {
    isFound = true;
    recorder.event("target-found");
  });
  targetEl.addEventListener("targetLost", () => {
    isFound = false;
    recorder.event("target-lost");
  });

  recorder.addProbe("found", () => isFound);
  recorder.addProbe("distanceUnits", () => poseValue("distanceUnits"));
  recorder.addProbe("distanceCm", () => {
    const units = poseValue("distanceUnits");
    if (units === null || targetWidthCm === null) return null;
    return Math.round(units * targetWidthCm);
  });
  recorder.addProbe("angleDeg", () => poseValue("angleDeg"));
  recorder.addProbe("acquisitionMs", () => metrics.get("acquisitionMs") ?? null);
  recorder.addProbe("lastRecoveryMs", () => metrics.get("lastRecoveryMs") ?? null);
  recorder.addProbe("targetFoundCount", () => metrics.get("targetFoundCount") ?? null);
  recorder.addProbe("targetLostCount", () => metrics.get("targetLostCount") ?? null);

  function poseValue(key: "distanceUnits" | "angleDeg"): number | null {
    if (!isFound) return null;
    const object3D = targetEl.object3D;
    if (!object3D) return null;
    const pose = readPose(object3D);
    return pose ? pose[key] : null;
  }

  const session = new GuidedSession(buildSteps(), () => recorder.elapsedMs());

  // The width answer arrives as a step result; every later distance hint
  // depends on it, so pick it up as soon as that step resolves.
  session.onChange((view) => {
    const answer = view.results.find((result) => result.id === "target-width");
    if (answer && targetWidthCm === null) {
      targetWidthCm = parseTargetWidthCm(answer.note);
      if (targetWidthCm !== null) log.log("target width: " + targetWidthCm + " cm");
    }
  });

  recorder.onSample((sample) => session.feed(sample));

  const panel = new GuidedPanel(session, {
    latestSample: () => recorder.getLatestSample(),
    contextFields: ["distanceCm", "angleDeg", "luminance", "motion", "fps", "found"],
    onFinish: (operatorNotes) => finish(operatorNotes),
  });
  panel.mount();

  function finish(operatorNotes: string): void {
    recorder.stop();
    const report = buildReport(recorder, session.getResults(), {
      lab: "lab-02-image-tracking",
      labTitle: "LAB A2 — Image Tracking",
      camera: describeCamera(),
      summary: {
        targetWidthCm,
        acquisitionMs: metrics.get("acquisitionMs") ?? null,
        lastRecoveryMs: metrics.get("lastRecoveryMs") ?? null,
        targetFoundCount: metrics.get("targetFoundCount") ?? null,
        targetLostCount: metrics.get("targetLostCount") ?? null,
        motionSensorAvailable: recorder.motion.isAvailable(),
      },
      operatorNotes,
    });
    downloadReport(report);
    log.log("guided session finished — report downloaded");
    document.body.classList.remove("guided-running");
  }

  /**
   * MindAR creates and owns its own <video>; it is not in our markup, so
   * it can only be found once the AR pipeline is up.
   */
  function describeCamera(): Record<string, Primitive> {
    const video = document.querySelector("video");
    const track = (video?.srcObject as MediaStream | null)?.getVideoTracks()[0];
    const settings = track?.getSettings();
    return {
      resolution: settings ? settings.width + "x" + settings.height : null,
      facingMode: settings?.facingMode ?? null,
      frameRate: settings?.frameRate ? Math.round(settings.frameRate) : null,
      trackState: track?.readyState ?? null,
      cameraOwner: "MindAR (mindar-image-system)",
    };
  }

  async function start(): Promise<void> {
    context.ensureStarted();
    document.body.classList.add("guided-running");

    // Reset carried-over readings so a second run cannot inherit the
    // first one's recovery time and look better than it was.
    metrics.set("lastRecoveryMs", null);

    recorder.start();
    // Must be awaited from inside the click handler's task on iOS, where
    // the motion permission prompt is gated on the user gesture.
    const motionOk = await recorder.motion.request();
    recorder.event("motion-sensor", motionOk ? "available" : "unavailable");

    const video = document.querySelector("video");
    recorder.luminance.attach(video);
    if (!video) recorder.event("luminance-probe", "no video element found yet");

    session.start();
    log.log("guided session started");
  }

  return { start };
}

function buildSteps(): GuidedStep[] {
  const steps: GuidedStep[] = [
    {
      id: "target-width",
      label: "¿Cuánto mide el lado largo del target impreso?",
      fills: "Tamaño del target (§8) — sin esto las distancias no van en cm",
      choices: ["5 cm", "9 cm", "15 cm", "21 cm"],
    },
    {
      id: "acquisition",
      label: "Apuntá al target de frente, a distancia cómoda, y mantené hasta que enganche.",
      fills: "SEARCHING → FOUND · tiempo de adquisición",
      auto: {
        ok: (sample) => sample.found === true,
        hint: (sample) =>
          sample.found === true
            ? "enganchado — mantené"
            : "buscando… luma " + fmt(sample.luminance),
        holdMs: 1500,
        capture: ["acquisitionMs", "distanceCm", "angleDeg", "luminance", "fps"],
      },
      timeoutMs: 60_000,
    },
  ];

  for (const distance of DISTANCE_STEPS) {
    steps.push({
      id: distance.id,
      label: "Ponete a ~" + distance.cm + " cm del target, de frente.",
      fills: "Matriz — " + distance.cm + " cm",
      auto: {
        ok: (sample) =>
          sample.found === true && withinRange(sample.distanceCm, distance.min, distance.max),
        hint: (sample) => distanceHint(sample, distance.cm),
        holdMs: 2000,
        capture: ["distanceCm", "distanceUnits", "angleDeg", "fps", "luminance"],
      },
    });
  }

  for (const angle of ANGLE_STEPS) {
    steps.push({
      id: angle.id,
      label: "Mirá el target " + angle.label + ", a distancia cómoda.",
      fills: "Matriz — ángulo " + angle.label,
      auto: {
        ok: (sample) =>
          sample.found === true && withinRange(sample.angleDeg, angle.min, angle.max),
        hint: (sample) =>
          sample.found === true
            ? "ángulo " + fmt(sample.angleDeg) + "° · objetivo " + angle.min + "–" + angle.max + "°"
            : "tracking perdido — volvé a enganchar",
        holdMs: 2000,
        capture: ["angleDeg", "distanceCm", "fps"],
      },
    });
  }

  steps.push(
    {
      id: "light-low",
      label: "Bajá la luz (apagá una lámpara o tapá la ventana) sin perder el target.",
      fills: "Matriz — luz baja",
      auto: {
        ok: (sample) => sample.found === true && belowValue(sample.luminance, 60),
        hint: (sample) => "luma " + fmt(sample.luminance) + " · objetivo < 60" + trackingSuffix(sample),
        holdMs: 2500,
        capture: ["luminance", "distanceCm", "fps"],
      },
      askNote: true,
    },
    {
      id: "light-bright",
      label: "Ahora luz fuerte — llevalo a una ventana o encendé todo.",
      fills: "Matriz — luz fuerte",
      auto: {
        ok: (sample) => sample.found === true && aboveValue(sample.luminance, 150),
        hint: (sample) => "luma " + fmt(sample.luminance) + " · objetivo > 150" + trackingSuffix(sample),
        holdMs: 2500,
        capture: ["luminance", "distanceCm", "fps"],
      },
      askNote: true,
    },
    {
      id: "camera-motion",
      label: "Movete alrededor del target mientras lo seguís apuntando.",
      fills: "Matriz — cámara en movimiento",
      auto: {
        ok: (sample) => sample.found === true && aboveValue(sample.motion, 1.2),
        hint: (sample) =>
          sample.motion === null
            ? "sin acelerómetro — usá «Omitir»"
            : "movimiento " + fmt(sample.motion) + " m/s²" + trackingSuffix(sample),
        holdMs: 3000,
        capture: ["motion", "distanceCm", "angleDeg", "fps"],
      },
    },
    {
      id: "recovery",
      label: "Sacá el target de cuadro y volvé a apuntarlo.",
      fills: "Reacquisición tras TARGET LOST · tiempo de recuperación",
      auto: {
        ok: (sample) => sample.found === true && sample.lastRecoveryMs !== null,
        hint: (sample) =>
          sample.lastRecoveryMs === null
            ? "esperando una pérdida y su recuperación…"
            : "recuperado en " + fmt(sample.lastRecoveryMs) + " ms",
        holdMs: 800,
        capture: ["lastRecoveryMs", "targetLostCount", "distanceCm"],
      },
    },
    {
      id: "occlusion",
      label: "Tapá como la mitad del target con la mano. ¿El tracking aguantó?",
      fills: "Matriz — oclusión parcial",
      askNote: true,
    },
    {
      id: "target-motion",
      label: "Ahora movés el target (no el teléfono). ¿Lo siguió?",
      fills: "Matriz — target en movimiento",
      askNote: true,
    },
    {
      id: "subjective",
      label: "El objeto 3D sobre el target, ¿se veía firme? ¿Tembló, flotó o se desfasó?",
      fills: "§8 — jitter y calidad percibida",
      askNote: true,
    },
  );

  return steps;
}

function distanceHint(sample: EvidenceSample, targetCm: number): string {
  if (sample.found !== true) return "tracking perdido — volvé a enganchar";
  const current = sample.distanceCm;
  if (typeof current !== "number") return "distancia no disponible (falta el ancho del target)";
  const delta = current - targetCm;
  const direction = Math.abs(delta) < 3 ? "ahí está" : delta > 0 ? "acercate" : "alejate";
  return current + " cm · objetivo " + targetCm + " cm — " + direction;
}

function trackingSuffix(sample: EvidenceSample): string {
  return sample.found === true ? "" : " · tracking perdido";
}

function withinRange(value: Primitive, min: number, max: number): boolean {
  return typeof value === "number" && value >= min && value <= max;
}

function aboveValue(value: Primitive, threshold: number): boolean {
  return typeof value === "number" && value > threshold;
}

function belowValue(value: Primitive, threshold: number): boolean {
  return typeof value === "number" && value < threshold;
}

function fmt(value: Primitive): string {
  return value === null || value === undefined ? "—" : String(value);
}
