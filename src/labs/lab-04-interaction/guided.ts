import { EvidenceRecorder } from "../../core/evidence/EvidenceRecorder";
import { GuidedSession, type GuidedStep } from "../../core/evidence/GuidedSession";
import { GuidedPanel } from "../../core/evidence/GuidedPanel";
import { buildReport, downloadReport } from "../../core/evidence/ReportBuilder";
import type { EvidenceSample, Primitive } from "../../core/evidence/types";
import type { MetricsService } from "../../core/metrics/MetricsService";
import type { EventLog } from "../../core/metrics/EventLog";
import { parseTargetWidthCm, readPose, type Object3DLike } from "../../core/ar/TargetPose";
import { summariseTaps, type TapResult } from "../../core/ar/ScreenRaycaster";

/**
 * Guided evidence session for LAB A4.
 *
 * Three tap batches, each measuring something the others cannot:
 *
 *  - **aimed at the character** — the hit rate people actually care about,
 *  - **deliberately beside it** — false positives. A hit area generous
 *    enough to feel good and generous enough to fire when you did not mean
 *    it are the same setting, so measuring only the first would make an
 *    over-eager hit box look like a success,
 *  - **from a metre away** — the character is smaller on screen there, so
 *    this is where a fixed-pixel hit area stops working.
 *
 * The counter is reset when each batch starts, so the three figures are
 * independent instead of the later ones being diluted by the earlier.
 */

export interface GuidedContext {
  metrics: MetricsService;
  log: EventLog;
  targetEl: HTMLElement & { object3D?: Object3DLike };
  wrapperEl: HTMLElement;
  isFound: () => boolean;
  getTaps: () => Array<TapResult & { latencyMs: number | null }>;
  resetTaps: () => void;
  ensureStarted: () => void;
}

const TAP_CAPTURE = ["taps", "hitRatePct", "medianLatencyMs", "closestMissPx", "distanceCm", "fps"];

export function attachGuidedSession(context: GuidedContext): { start: () => Promise<void> } {
  const { metrics, log, targetEl } = context;

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

  // Read from the live tap list rather than from metrics: the summary has
  // to reflect only the taps in the current batch, and metrics carries
  // whatever the previous batch left behind.
  recorder.addProbe("taps", () => summariseTaps(context.getTaps()).taps);
  recorder.addProbe("hitRatePct", () => summariseTaps(context.getTaps()).hitRatePct);
  recorder.addProbe("medianLatencyMs", () => summariseTaps(context.getTaps()).medianLatencyMs);
  recorder.addProbe("p90LatencyMs", () => summariseTaps(context.getTaps()).p90LatencyMs);
  recorder.addProbe("closestMissPx", () => summariseTaps(context.getTaps()).closestMissPx);
  recorder.addProbe(
    "medianMissDistancePx",
    () => summariseTaps(context.getTaps()).medianMissDistancePx,
  );
  recorder.addProbe("clipCount", () => metrics.get("clipCount") ?? null);

  const session = new GuidedSession(buildSteps(), () => recorder.elapsedMs());

  session.onChange((view) => {
    const answer = view.results.find((result) => result.id === "target-width");
    if (answer && targetWidthCm === null) {
      targetWidthCm = parseTargetWidthCm(answer.note);
      if (targetWidthCm !== null) log.log("target width: " + targetWidthCm + " cm");
    }

    const step = view.step;
    if (!step || triggered.has(step.id)) return;
    if (step.id.startsWith("tap-")) {
      triggered.add(step.id);
      context.resetTaps();
      recorder.event("tap-batch", step.id);
    }
  });

  recorder.onSample((sample) => session.feed(sample));

  const panel = new GuidedPanel(session, {
    latestSample: () => recorder.getLatestSample(),
    contextFields: ["taps", "hitRatePct", "medianLatencyMs", "distanceCm", "fps", "found"],
    onFinish: (operatorNotes) => finish(operatorNotes),
  });
  panel.mount();

  function finish(operatorNotes: string): void {
    recorder.stop();
    const report = buildReport(recorder, session.getResults(), {
      lab: "lab-04-interaction",
      labTitle: "LAB A4 — Interaction",
      camera: describeCamera(),
      summary: {
        targetWidthCm,
        clipCount: metrics.get("clipCount") ?? null,
        // Absent on iOS Safari; a lab about tactile feedback should say so
        // rather than let a reader assume haptics are available.
        vibrationSupported: typeof navigator.vibrate === "function",
        motionSensorAvailable: recorder.motion.isAvailable(),
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
      viewport: window.innerWidth + "x" + window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      cameraOwner: "MindAR (mindar-image-system)",
    };
  }

  async function start(): Promise<void> {
    context.ensureStarted();
    document.body.classList.add("guided-running");

    recorder.start();
    const motionOk = await recorder.motion.request();
    recorder.event("motion-sensor", motionOk ? "available" : "unavailable");
    recorder.luminance.attach(document.querySelector("video"));

    session.start();
    log.log("guided session started");
  }

  return { start };
}

function buildSteps(): GuidedStep[] {
  return [
    {
      id: "target-width",
      label: "¿Cuánto mide el lado largo del target impreso?",
      fills: "Escala — permite reportar la distancia en cm",
      choices: ["5 cm", "9 cm", "15 cm", "21 cm"],
    },
    {
      id: "acquisition",
      label: "Apuntá al target hasta que aparezca el personaje.",
      fills: "El objeto interactivo está en escena",
      auto: {
        ok: (sample) => sample.found === true,
        hint: (sample) => (sample.found === true ? "enganchado" : "buscando el target…"),
        holdMs: 1200,
        capture: ["distanceCm", "fps"],
      },
      timeoutMs: 60_000,
    },
    {
      id: "tap-on",
      label: "Tocá el personaje 10 veces, a distancia cómoda. Apuntá al cuerpo.",
      fills: "Tasa de acierto · latencia de respuesta",
      auto: {
        ok: (sample) => atLeastTaps(sample, 10),
        hint: (sample) => tapHint(sample, 10),
        holdMs: 300,
        capture: TAP_CAPTURE,
      },
      timeoutMs: 90_000,
      askNote: true,
    },
    {
      id: "tap-beside",
      label: "Ahora tocá 5 veces AL LADO del personaje, a un par de dedos de distancia. Sin tocarlo.",
      // Here a high hit rate is the failure, not the success.
      fills: "Falsos positivos — ¿el área de toque es demasiado generosa?",
      auto: {
        ok: (sample) => atLeastTaps(sample, 5),
        hint: (sample) => tapHint(sample, 5),
        holdMs: 300,
        capture: TAP_CAPTURE,
      },
      timeoutMs: 90_000,
      askNote: true,
    },
    {
      id: "tap-far",
      label: "Alejate a ~1 metro del target y tocá el personaje 5 veces.",
      fills: "Acierto a distancia — el personaje ocupa menos pantalla",
      auto: {
        ok: (sample) => atLeastTaps(sample, 5) && aboveCm(sample, 70),
        hint: (sample) =>
          aboveCm(sample, 70)
            ? tapHint(sample, 5)
            : "alejate un poco — " + fmt(sample.distanceCm) + " cm",
        holdMs: 300,
        capture: TAP_CAPTURE,
      },
      timeoutMs: 120_000,
      askNote: true,
    },
    {
      id: "latency-felt",
      label: "¿La reacción al toque se sintió inmediata, o notaste retardo?",
      // The number and the feeling are different findings: sub-100 ms can
      // still feel laggy if the animation ramps in slowly.
      fills: "§8 — latencia percibida vs. medida",
      askNote: true,
    },
    {
      id: "haptics",
      label: "¿El teléfono vibró al acertar?",
      fills: "§8 — feedback háptico disponible en este navegador",
      askNote: true,
    },
    {
      id: "natural",
      label: "¿Se sintió natural tocarlo, o tuviste que apuntar con cuidado?",
      fills: "§8 — ¿se comporta como un elemento de UI?",
      askNote: true,
    },
    {
      id: "cost",
      label: "¿Notaste que bajara el FPS, o que el teléfono se calentara, al interactuar?",
      fills: "§8 — costo de la interacción",
      askNote: true,
    },
  ];
}

function atLeastTaps(sample: EvidenceSample, count: number): boolean {
  return typeof sample.taps === "number" && sample.taps >= count;
}

function aboveCm(sample: EvidenceSample, cm: number): boolean {
  // Unknown distance must not block the step: the operator may have
  // skipped the width question, and a stalled session loses more evidence
  // than a loosely-gated one.
  if (typeof sample.distanceCm !== "number") return true;
  return sample.distanceCm >= cm;
}

function tapHint(sample: EvidenceSample, target: number): string {
  const taps = typeof sample.taps === "number" ? sample.taps : 0;
  const rate = sample.hitRatePct;
  return (
    taps + "/" + target + " toques" +
    (typeof rate === "number" && taps > 0 ? " · " + rate + "% acierto" : "") +
    (sample.found === true ? "" : " · tracking perdido")
  );
}

function fmt(value: Primitive): string {
  return value === null || value === undefined ? "—" : String(value);
}
