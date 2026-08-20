import type { EvidenceSample, Primitive, SessionReport, StepResult } from "./types";
import { summariseFps } from "./EvidenceRecorder";
import { captureDeviceProfile } from "./DeviceProfile";
import type { EvidenceRecorder } from "./EvidenceRecorder";

/**
 * ReportBuilder — turns a recorded session into the two artefacts the
 * workflow actually needs.
 *
 * The JSON is the evidence: complete, machine-readable, nothing rounded
 * away. The Markdown is the human-facing half, laid out to match the
 * README's §8 "Reflexiones" and lab-02's physical matrix, so closing a lab
 * is a paste rather than a transcription. Both are downloaded together —
 * a Markdown summary with no underlying evidence is exactly the kind of
 * unfalsifiable claim PLAYBOOK §23.2 exists to prevent.
 */

export interface BuildOptions {
  lab: string;
  labTitle: string;
  camera: Record<string, Primitive>;
  summary: Record<string, Primitive>;
  operatorNotes: string;
}

export function buildReport(
  recorder: EvidenceRecorder,
  steps: StepResult[],
  options: BuildOptions,
): SessionReport {
  const samples = recorder.getSamples();

  return {
    lab: options.lab,
    labTitle: options.labTitle,
    startedAt: recorder.getStartedAtIso(),
    endedAt: new Date().toISOString(),
    durationSeconds: Math.round(recorder.elapsedMs() / 1000),
    device: captureDeviceProfile(),
    camera: options.camera,
    fps: summariseFps(samples),
    steps,
    events: recorder.getEvents(),
    samples,
    samplesDecimated: recorder.wasDecimated(),
    summary: options.summary,
    operatorNotes: options.operatorNotes,
  };
}

export function reportToMarkdown(report: SessionReport): string {
  const { browser, os } = parseUserAgent(report.device.userAgent);
  const lighting = describeLighting(report.samples);
  const device = report.device;
  const lines: string[] = [];

  lines.push("# Evidencia — " + report.labTitle);
  lines.push("");
  lines.push(
    "> Generado por el arnés de evidencia. Los campos marcados `no medido`" +
      " no se observaron — no rellenarlos a mano (PLAYBOOK §23.2).",
  );
  lines.push("");
  lines.push("- **Fecha**: " + report.startedAt);
  lines.push("- **Duración de la sesión**: " + formatDuration(report.durationSeconds));
  lines.push("");

  lines.push("## Entorno de prueba");
  lines.push("");
  lines.push(
    "**Device**: " +
      device.platform +
      (device.probablyMobile ? " (móvil)" : " (probablemente escritorio)") +
      " · **Browser**: " +
      browser +
      " · **OS**: " +
      os +
      " · **Lighting**: " +
      lighting,
  );
  lines.push("");
  lines.push(
    "- Pantalla: " +
      device.screen +
      " · viewport " +
      device.viewport +
      " · DPR " +
      device.devicePixelRatio,
  );
  lines.push(
    "- Núcleos: " +
      orNotMeasured(device.hardwareConcurrency) +
      " · Memoria: " +
      (device.deviceMemoryGb === null ? "no medido" : device.deviceMemoryGb + " GB"),
  );
  lines.push("- User agent: `" + device.userAgent + "`");
  lines.push("");

  lines.push("## Medido");
  lines.push("");
  for (const [key, value] of Object.entries(report.camera)) {
    lines.push("- **" + labelize(key) + "**: " + orNotMeasured(value));
  }
  if (report.fps) {
    const fps = report.fps;
    lines.push(
      "- **FPS**: mediana " +
        fps.median +
        " · p5 " +
        fps.p5 +
        " · rango " +
        fps.min +
        "–" +
        fps.max,
    );
    lines.push(
      "- **Degradación de FPS**: primer quinto " +
        fps.firstFifth +
        " → último quinto " +
        fps.lastFifth +
        " (**" +
        fps.retentionPct +
        "%** de retención) — " +
        degradationVerdict(fps.retentionPct),
    );
  } else {
    lines.push("- **FPS**: no medido (sesión demasiado corta)");
  }
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push("- **" + labelize(key) + "**: " + orNotMeasured(value));
  }
  lines.push("");

  lines.push("## Matriz de prueba física");
  lines.push("");
  lines.push("| Condición | Resultado | Medido | Cómo se determinó | Nota |");
  lines.push("|---|---|---|---|---|");
  for (const step of report.steps) {
    lines.push(
      "| " +
        step.label +
        " | " +
        outcomeLabel(step.outcome) +
        " | " +
        formatMeasured(step.measured) +
        " | " +
        (step.auto ? "automático" : "operador") +
        " | " +
        (step.note || "—") +
        " |",
    );
  }
  lines.push("");

  const backgrounded = report.events.some((event) => event.kind === "page-hidden");
  lines.push("## Línea de tiempo");
  lines.push("");
  lines.push("- Eventos registrados: " + report.events.length);
  lines.push(
    "- ¿La página pasó a segundo plano durante la sesión?: " +
      (backgrounded
        ? "sí — ver eventos `page-hidden`/`page-visible` en el JSON"
        : "no"),
  );
  if (report.samplesDecimated) {
    lines.push(
      "- ⚠ La sesión superó el límite de muestras y fue **decimada**: la" +
        " resolución temporal del JSON es menor que la nominal.",
    );
  }
  lines.push("");

  lines.push("## Notas del operador");
  lines.push("");
  lines.push(report.operatorNotes.trim() || "_(sin notas)_");
  lines.push("");

  lines.push("## Lo que este reporte NO responde");
  lines.push("");
  lines.push(
    "Ninguna métrica de acá cubre las preguntas de §8 sobre riesgos," +
      " implicaciones de seguridad, qué pasaría en producción, o qué" +
      " alternativa podría resolverlo mejor. Esas se responden leyendo la" +
      " evidencia, no capturándola.",
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Downloads both artefacts. The JSON is the evidence and the Markdown is
 * the summary; shipping one without the other defeats the point.
 */
export function downloadReport(report: SessionReport): void {
  const stamp = report.startedAt.replace(/[:.]/g, "-");
  downloadBlob(
    report.lab + "-evidence-" + stamp + ".json",
    JSON.stringify(report, null, 2),
    "application/json",
  );
  // Some mobile browsers drop a second programmatic download fired in the
  // same tick as the first; a short gap makes both land reliably.
  window.setTimeout(() => {
    downloadBlob(
      report.lab + "-report-" + stamp + ".md",
      reportToMarkdown(report),
      "text/markdown",
    );
  }, 400);
}

function downloadBlob(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel an in-flight download on some mobile
  // browsers, so give the navigation a moment to take the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function outcomeLabel(outcome: StepResult["outcome"]): string {
  if (outcome === "pass") return "✅ OK";
  if (outcome === "fail") return "❌ falló";
  return "⏭️ omitido";
}

function formatMeasured(measured: Record<string, Primitive>): string {
  const entries = Object.entries(measured).filter(([, value]) => value !== null);
  if (entries.length === 0) return "—";
  return entries.map(([key, value]) => labelize(key) + " " + value).join(", ");
}

/**
 * Best effort, and labelled as such in the output. Reliable UA parsing is
 * a losing game; the full string is printed verbatim above so a reader can
 * always check what this guessed.
 */
function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = "desconocido";
  if (/Edg\//.test(ua)) browser = "Edge " + match(ua, /Edg\/([\d.]+)/);
  else if (/OPR\//.test(ua)) browser = "Opera " + match(ua, /OPR\/([\d.]+)/);
  else if (/Firefox\//.test(ua)) browser = "Firefox " + match(ua, /Firefox\/([\d.]+)/);
  else if (/Chrome\//.test(ua)) browser = "Chrome " + match(ua, /Chrome\/([\d.]+)/);
  else if (/Safari\//.test(ua)) browser = "Safari " + match(ua, /Version\/([\d.]+)/);

  let os = "desconocido";
  if (/Android/.test(ua)) os = "Android " + match(ua, /Android ([\d.]+)/);
  else if (/iPhone|iPad|iPod/.test(ua))
    os = "iOS " + match(ua, /OS ([\d_]+)/).replace(/_/g, ".");
  else if (/Windows NT/.test(ua)) os = "Windows NT " + match(ua, /Windows NT ([\d.]+)/);
  else if (/Mac OS X/.test(ua))
    os = "macOS " + match(ua, /Mac OS X ([\d_]+)/).replace(/_/g, ".");
  else if (/Linux/.test(ua)) os = "Linux";

  return { browser, os };
}

function match(text: string, pattern: RegExp): string {
  return text.match(pattern)?.[1] ?? "?";
}

/**
 * Turns the luminance timeline into words. The thresholds are rough by
 * design — the raw numbers are in the JSON for anyone who needs precision;
 * this line exists so the README reads like a human wrote it.
 */
function describeLighting(samples: EvidenceSample[]): string {
  const values = samples
    .map((sample) => sample.luminance)
    .filter((value): value is number => value !== null);
  if (values.length === 0) return "no medido";

  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const band = median < 60 ? "luz baja" : median < 150 ? "luz media" : "luz fuerte";
  return band + " (luma mediana " + median + ", rango " + sorted[0] + "–" + sorted[sorted.length - 1] + ")";
}

function degradationVerdict(retentionPct: number): string {
  if (retentionPct >= 95) return "estable";
  if (retentionPct >= 85) return "leve caída";
  return "**caída significativa — investigar (térmico/batería)**";
}

function formatDuration(totalSeconds: number): string {
  return Math.floor(totalSeconds / 60) + "m " + (totalSeconds % 60) + "s";
}

function orNotMeasured(value: Primitive): string {
  if (value === null || value === undefined || value === "") return "no medido";
  return String(value);
}

function labelize(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}
