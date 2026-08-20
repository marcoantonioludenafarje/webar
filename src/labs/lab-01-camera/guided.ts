import { EvidenceRecorder } from "../../core/evidence/EvidenceRecorder";
import { GuidedSession, type GuidedStep } from "../../core/evidence/GuidedSession";
import { GuidedPanel } from "../../core/evidence/GuidedPanel";
import { buildReport, downloadReport } from "../../core/evidence/ReportBuilder";
import type { Primitive } from "../../core/evidence/types";
import type { MetricsService } from "../../core/metrics/MetricsService";

/**
 * Guided evidence session for LAB A1.
 *
 * A1's acceptance criteria are mostly about *endurance* — "stays active
 * for several minutes without degrading", "start/stop repeatedly", "the
 * browser doesn't kill the stream in background". None of those are
 * visible in a snapshot, which is why this lab's original JSON export
 * couldn't close it: the file said 1280x720 and no errors, and was equally
 * consistent with a rock-solid session and a collapsing one.
 *
 * So the one genuinely automated step here is the long one: hold the
 * stream and let the recorder describe the FPS curve. The rest are
 * questions, because "did the preview freeze when you came back?" is a
 * thing only the person holding the phone can see.
 */

/** A1 asks for "several minutes"; 90 s is the shortest run that shows a trend. */
const STABILITY_HOLD_MS = 90_000;

export interface GuidedContext {
  metrics: MetricsService;
  videoEl: HTMLVideoElement;
  /** Starts the camera if it isn't already streaming. */
  ensureStarted: () => Promise<void>;
  isStreaming: () => boolean;
}

export function attachGuidedSession(context: GuidedContext): {
  start: () => Promise<void>;
} {
  const { metrics, videoEl } = context;
  const recorder = new EvidenceRecorder({ fps: () => metrics.getFps() });

  recorder.addProbe("streaming", () => context.isStreaming());
  recorder.addProbe("videoWidth", () => videoEl.videoWidth || null);
  recorder.addProbe("readyState", () => videoEl.readyState);

  const session = new GuidedSession(buildSteps(), () => recorder.elapsedMs());
  recorder.onSample((sample) => session.feed(sample));

  const panel = new GuidedPanel(session, {
    latestSample: () => recorder.getLatestSample(),
    contextFields: ["fps", "luminance", "streaming", "readyState"],
    onFinish: (operatorNotes) => finish(operatorNotes),
  });
  panel.mount();

  function finish(operatorNotes: string): void {
    recorder.stop();
    const report = buildReport(recorder, session.getResults(), {
      lab: "lab-01-camera",
      labTitle: "LAB A1 — Camera",
      camera: describeCamera(),
      summary: {
        startLatencyMs: metrics.get("startLatencyMs") ?? null,
        cameraError: metrics.get("cameraError") ?? null,
        motionSensorAvailable: recorder.motion.isAvailable(),
      },
      operatorNotes,
    });
    downloadReport(report);
    document.body.classList.remove("guided-running");
  }

  /**
   * Read from the live track rather than from the values cached at start:
   * a stream can renegotiate resolution mid-session (some Android cameras
   * drop it under thermal pressure), and that change is itself a finding.
   */
  function describeCamera(): Record<string, Primitive> {
    const track = (videoEl.srcObject as MediaStream | null)?.getVideoTracks()[0];
    const settings = track?.getSettings();
    return {
      resolution: settings ? settings.width + "x" + settings.height : null,
      facingMode: settings?.facingMode ?? null,
      frameRate: settings?.frameRate ? Math.round(settings.frameRate) : null,
      deviceLabel: track?.label ?? null,
      trackState: track?.readyState ?? null,
      startLatencyMs: metrics.get("startLatencyMs") ?? null,
    };
  }

  async function start(): Promise<void> {
    await context.ensureStarted();
    document.body.classList.add("guided-running");

    recorder.start();
    recorder.luminance.attach(videoEl);
    const motionOk = await recorder.motion.request();
    recorder.event("motion-sensor", motionOk ? "available" : "unavailable");

    session.start();
  }

  return { start };
}

function buildSteps(): GuidedStep[] {
  return [
    {
      id: "rear-camera",
      label: "¿Lo que ves en pantalla está DETRÁS del teléfono (no tu cara)?",
      // Asked rather than auto-detected: getSettings().facingMode is
      // authoritative on phones but reports "unknown" on most desktop
      // webcams, so trusting it alone would silently fail the criterion on
      // exactly the devices where it is hardest to notice. The machine
      // reading is captured alongside the answer so both are in the report.
      fills: "Criterio — cámara trasera",
      askNote: true,
    },
    {
      id: "stability",
      label: "Dejá la cámara corriendo y no toques nada. Mirá si la imagen se traba o el teléfono se calienta.",
      fills: "Criterio — se mantiene activa varios minutos sin degradarse",
      auto: {
        ok: (sample) => sample.streaming === true && sample.fps > 0,
        hint: (sample) =>
          sample.streaming === true
            ? "grabando · " + sample.fps + " fps · " + Math.round(sample.t / 1000) + " s"
            : "el stream se cortó — eso es un hallazgo, anotalo al final",
        holdMs: STABILITY_HOLD_MS,
        capture: ["fps", "luminance", "videoWidth", "readyState"],
      },
      timeoutMs: STABILITY_HOLD_MS + 30_000,
    },
    {
      id: "background",
      label: "Salí de la app ~10 s (pantalla de inicio) y volvé. ¿La imagen seguía viva al volver?",
      fills: "Criterio — ¿el navegador mata el stream en segundo plano?",
      askNote: true,
    },
    {
      id: "restart",
      label: "Tocá Stop y Start tres veces seguidas. ¿Arrancó siempre bien?",
      fills: "Criterio — Start/Stop confiable y repetible",
      askNote: true,
    },
    {
      id: "subjective",
      label: "¿Notaste algo raro? Calentamiento, tirones, colores lavados, enfoque que no engancha.",
      fills: "§8 — limitaciones y calidad percibida",
      askNote: true,
    },
  ];
}
