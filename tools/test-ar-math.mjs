/**
 * Tests for the load-bearing calculations: target pose, jitter, FPS trend.
 *
 * These are the numbers every lab conclusion rests on. A silent error in
 * them does not crash anything — it produces a plausible report, which is
 * worse: the mistake would be discovered only after someone ran a physical
 * session and acted on the result.
 *
 * Physical behaviour still has to be validated on a phone; what is checked
 * here is that the maths does what it claims (PLAYBOOK §23.2 — the code
 * being right is not the same as the capability being validated).
 *
 * Usage: npm test
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Bundle a TypeScript source in memory and import it.
 *
 * esbuild ships inside the Vite install, so this needs no extra
 * dependency. Its JS API is used rather than the CLI because Node on
 * Windows refuses to spawn a .cmd shim, and writing to a temp directory
 * just to read it back adds a failure mode for no benefit.
 */
async function load(entry) {
  const result = await esbuild.build({
    entryPoints: [join(ROOT, entry)],
    bundle: true,
    format: "esm",
    write: false,
    logLevel: "error",
  });
  const source = result.outputFiles[0].text;
  return import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
}

const { readPose, parseTargetWidthCm } = await load("src/core/ar/TargetPose.ts");
const { JitterProbe } = await load("src/core/ar/JitterProbe.ts");
const { summariseFps } = await load("src/core/evidence/EvidenceRecorder.ts");

let failures = 0;
let current = "";

function section(name) {
  current = name;
  console.log("\n" + name);
}

function check(name, actual, predicate, expectation) {
  const ok = typeof predicate === "function" ? predicate(actual) : actual === predicate;
  console.log("  " + (ok ? "PASS" : "FAIL") + "  " + name + "  ->  " + JSON.stringify(actual) +
    (ok ? "" : "   (esperado " + expectation + ")"));
  if (!ok) failures += 1;
}

const near = (expected, tolerance) => (actual) => Math.abs(actual - expected) <= tolerance;
const below = (limit) => (actual) => actual < limit;
const isNull = (actual) => actual === null;

// ── Pose ───────────────────────────────────────────────────────────────

const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
const node = (x, y, z, quaternion = IDENTITY) => ({ position: { x, y, z }, quaternion, visible: true });

/** Rotation of `deg` around the Y axis. */
function quatY(deg) {
  const half = (deg * Math.PI) / 360;
  return { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
}

section("Pose — distancia");
check("2 unidades al frente", readPose(node(0, 0, -2)).distanceUnits, near(2, 0.001), "2");
check("triangulo 3-4-5", readPose(node(3, 4, 0)).distanceUnits, near(5, 0.001), "5");
check("pose degenerada", readPose(node(0, 0, 0)), isNull, "null");

section("Pose — angulo de vision");
check("frontal", readPose(node(0, 0, -2)).angleDeg, near(0, 0.5), "0");
check("yaw 30", readPose(node(0, 0, -2, quatY(30))).angleDeg, near(30, 0.5), "30");
check("yaw 60", readPose(node(0, 0, -2, quatY(60))).angleDeg, near(60, 0.5), "60");
check("yaw 90 (de canto)", readPose(node(0, 0, -2, quatY(90))).angleDeg, near(90, 0.5), "90");
// Past 90 the angle must fold back rather than report an impossible value.
check("yaw 120 se pliega a 60", readPose(node(0, 0, -2, quatY(120))).angleDeg, near(60, 0.5), "60");

section("Pose — ancho del target");
check("9 cm", parseTargetWidthCm("9 cm"), 9, "9");
check("21 cm", parseTargetWidthCm("21 cm"), 21, "21");
check("decimales con coma", parseTargetWidthCm("8,5 cm"), 8.5, "8.5");
check("respuesta sin numero", parseTargetWidthCm("no me acuerdo"), isNull, "null");

// ── Jitter ─────────────────────────────────────────────────────────────

let seed = 12345;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff - 0.5;
};

function jitterOf(generator, samples = 60) {
  const probe = new JitterProbe();
  for (let i = 0; i < samples; i += 1) probe.sample(generator(i));
  return probe.read();
}

section("Jitter — rechazo de movimiento real");
check("teléfono quieto", jitterOf(() => node(0, 0, -2)).rmsUnits, 0, "0");
// The whole point: an operator moving smoothly is not jitter.
seed = 12345;
check("deriva lineal (mano moviéndose)", jitterOf((i) => node(i * 0.004, 0, -2 + i * 0.002)).rmsUnits,
  below(1e-6), "~0");
seed = 12345;
const curve = jitterOf((i) => node(0.3 * Math.sin(i / 20), 0, -2));
check("barrido curvo", curve.rmsUnits, below(3e-4), "< 0.0003");

section("Jitter — deteccion de temblor");
seed = 12345;
const twitch = jitterOf(() => node(noise() * 0.004, noise() * 0.004, -2 + noise() * 0.004));
check("temblor de 0.004 detectado", twitch.rmsUnits, (v) => v > 0.0005 && v < 0.004, "0.0005–0.004");

// The discriminating case: the same twitch riding on large smooth motion
// must read the same as the twitch alone.
seed = 12345;
const mixed = jitterOf((i) => node(i * 0.01 + noise() * 0.004, noise() * 0.004, -2 + noise() * 0.004));
check("temblor + deriva grande", Math.round((mixed.rmsUnits / twitch.rmsUnits) * 100) / 100,
  (v) => v > 0.9 && v < 1.1, "ratio 0.9–1.1");
check("fuga del barrido vs temblor real",
  Math.round((curve.rmsUnits / twitch.rmsUnits) * 100) + "%",
  () => curve.rmsUnits / twitch.rmsUnits < 0.25, "< 25%");

section("Jitter — casos degradados");
check("historial insuficiente", jitterOf(() => node(0, 0, -2), 15), isNull, "null");
check("posiciones NaN", jitterOf(() => node(NaN, 0, -2)), isNull, "null");
check("object3D ausente", (() => {
  const probe = new JitterProbe();
  probe.sample(null);
  probe.sample(undefined);
  return probe.read();
})(), isNull, "null");
check("reset limpia el historial", (() => {
  const probe = new JitterProbe();
  for (let i = 0; i < 40; i += 1) probe.sample(node(0, 0, -2));
  probe.reset();
  return probe.read();
})(), isNull, "null");

section("Jitter — conversion a milimetros");
seed = 12345;
const mmProbe = new JitterProbe();
for (let i = 0; i < 60; i += 1) mmProbe.sample(node(noise() * 0.004, 0, -2));
check("target de 9 cm", mmProbe.readMm(9).rmsMm, near(mmProbe.read().rmsUnits * 90, 0.02), "unidades x 90");
check("sin ancho conocido", mmProbe.readMm(null), isNull, "null");

// ── FPS ────────────────────────────────────────────────────────────────

const series = (fn, count = 100) =>
  Array.from({ length: count }, (_, i) => ({ t: i * 500, fps: fn(i), luminance: null, motion: null }));

section("FPS — tendencia de la sesion");
const steady = summariseFps(series(() => 60));
check("estable: retencion", steady.retentionPct, 100, "100");
check("estable: mediana", steady.median, 60, "60");

// 60 fps decaying to 30 across the session — the thermal case A1 asks about.
const decaying = summariseFps(series((i) => Math.round(60 - i * 0.3)));
check("degradado: retencion", decaying.retentionPct, near(58, 1), "~58");
check("degradado: minimo", decaying.min, 30, "30");
check("degradado: p5 < mediana", decaying.p5 < decaying.median, true, "true");
check("sesion demasiado corta", summariseFps([{ fps: 60 }, { fps: 60 }]), isNull, "null");

// ── Done ───────────────────────────────────────────────────────────────

console.log(failures === 0 ? "\nTodo OK.\n" : "\n" + failures + " fallaron (" + current + ").\n");
process.exit(failures === 0 ? 0 : 1);
