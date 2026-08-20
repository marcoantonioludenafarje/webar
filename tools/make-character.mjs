/**
 * Generates the animated GLB characters used by LAB A3.
 *
 * Why generate instead of downloading one: LAB A3 asks what the *size* of
 * an asset costs — load time over mobile data, parse time, memory, FPS.
 * A single borrowed model answers none of that. Here the same character is
 * emitted at three tessellation levels, so the only variable between them
 * is geometry weight. It also sidesteps asset licensing entirely and keeps
 * the repo self-contained (CLAUDE.md §3: no external services).
 *
 * Writes glTF 2.0 binary (.glb) by hand — no dependencies, per §17. The
 * format is a 12-byte header followed by a JSON chunk and a BIN chunk,
 * each padded to a 4-byte boundary.
 *
 * Usage: node tools/make-character.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "models");

/**
 * Three weights spanning the range a real project would face: something
 * you would happily ship, something typical, and something careless.
 */
const VARIANTS = [
  { name: "character-small", segments: 16, rings: 12 },
  { name: "character-medium", segments: 64, rings: 48 },
  { name: "character-large", segments: 176, rings: 132 },
];

// ── Geometry primitives ────────────────────────────────────────────────

/** Axis-aligned box centred on the origin, flat-shaded (24 verts). */
function box(width, height, depth) {
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;

  const faces = [
    { normal: [0, 0, 1], corners: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]] },
    { normal: [0, 0, -1], corners: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]] },
    { normal: [1, 0, 0], corners: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]] },
    { normal: [-1, 0, 0], corners: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]] },
    { normal: [0, 1, 0], corners: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]] },
    { normal: [0, -1, 0], corners: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]] },
  ];

  const positions = [];
  const normals = [];
  const indices = [];

  for (const face of faces) {
    const base = positions.length / 3;
    for (const corner of face.corners) {
      positions.push(...corner);
      normals.push(...face.normal);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  return { positions, normals, indices };
}

/** UV sphere. Segment/ring counts are what drive the file size. */
function sphere(radius, segments, rings) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let ring = 0; ring <= rings; ring += 1) {
    const phi = (ring / rings) * Math.PI;
    for (let segment = 0; segment <= segments; segment += 1) {
      const theta = (segment / segments) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      positions.push(nx * radius, ny * radius, nz * radius);
      normals.push(nx, ny, nz);
    }
  }

  const stride = segments + 1;
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * stride + segment;
      const b = a + stride;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  return { positions, normals, indices };
}

// ── glTF assembly ──────────────────────────────────────────────────────

class GltfBuilder {
  constructor() {
    this.json = {
      asset: { version: "2.0", generator: "webar-lab make-character.mjs" },
      scene: 0,
      scenes: [{ nodes: [] }],
      nodes: [],
      meshes: [],
      materials: [],
      accessors: [],
      bufferViews: [],
      buffers: [],
      animations: [],
    };
    this.chunks = [];
    this.byteLength = 0;
  }

  /** Appends bytes to the BIN chunk, 4-byte aligned, returns a bufferView. */
  pushView(typedArray, target) {
    const bytes = Buffer.from(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength,
    );
    const padding = (4 - (this.byteLength % 4)) % 4;
    if (padding > 0) {
      this.chunks.push(Buffer.alloc(padding));
      this.byteLength += padding;
    }
    const offset = this.byteLength;
    this.chunks.push(bytes);
    this.byteLength += bytes.length;

    this.json.bufferViews.push({
      buffer: 0,
      byteOffset: offset,
      byteLength: bytes.length,
      ...(target ? { target } : {}),
    });
    return this.json.bufferViews.length - 1;
  }

  addAccessor(typedArray, componentType, type, target, extras = {}) {
    const view = this.pushView(typedArray, target);
    const count = typedArray.length / COMPONENTS[type];
    this.json.accessors.push({
      bufferView: view,
      componentType,
      count,
      type,
      ...extras,
    });
    return this.json.accessors.length - 1;
  }

  addMaterial(name, color) {
    this.json.materials.push({
      name,
      pbrMetallicRoughness: {
        baseColorFactor: [...color, 1],
        metallicFactor: 0.05,
        roughnessFactor: 0.75,
      },
    });
    return this.json.materials.length - 1;
  }

  addMesh(name, geometry, material) {
    const positions = new Float32Array(geometry.positions);
    // POSITION accessors must carry min/max — viewers use them for
    // bounding boxes and frustum culling, and A-Frame will not centre the
    // model correctly without them.
    const position = this.addAccessor(positions, 5126, "VEC3", 34962, {
      min: axisMin(positions),
      max: axisMax(positions),
    });
    const normal = this.addAccessor(
      new Float32Array(geometry.normals),
      5126,
      "VEC3",
      34962,
    );

    const vertexCount = positions.length / 3;
    const indices =
      vertexCount > 65535
        ? this.addAccessor(new Uint32Array(geometry.indices), 5125, "SCALAR", 34963)
        : this.addAccessor(new Uint16Array(geometry.indices), 5123, "SCALAR", 34963);

    this.json.meshes.push({
      name,
      primitives: [{ attributes: { POSITION: position, NORMAL: normal }, indices, material }],
    });
    return this.json.meshes.length - 1;
  }

  addNode(node) {
    this.json.nodes.push(node);
    return this.json.nodes.length - 1;
  }

  /**
   * One animation clip. `channels` is a list of
   * {node, path, times, values} — rotations as quaternions, translations
   * as vec3.
   */
  addAnimation(name, channels) {
    const clip = { name, samplers: [], channels: [] };

    for (const channel of channels) {
      const times = new Float32Array(channel.times);
      const input = this.addAccessor(times, 5126, "SCALAR", undefined, {
        // Required for animation inputs: players use them to know the
        // clip's duration without scanning the data.
        min: [times[0]],
        max: [times[times.length - 1]],
      });
      const type = channel.path === "rotation" ? "VEC4" : "VEC3";
      const output = this.addAccessor(
        new Float32Array(channel.values),
        5126,
        type,
        undefined,
      );

      clip.samplers.push({ input, output, interpolation: "LINEAR" });
      clip.channels.push({
        sampler: clip.samplers.length - 1,
        target: { node: channel.node, path: channel.path },
      });
    }

    this.json.animations.push(clip);
  }

  toGlb() {
    this.json.buffers = [{ byteLength: this.byteLength }];

    const jsonText = JSON.stringify(this.json);
    const jsonBuffer = padTo4(Buffer.from(jsonText, "utf8"), 0x20);
    const binBuffer = padTo4(Buffer.concat(this.chunks), 0x00);

    const header = Buffer.alloc(12);
    header.write("glTF", 0, "ascii");
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(12 + 8 + jsonBuffer.length + 8 + binBuffer.length, 8);

    return Buffer.concat([
      header,
      chunkHeader(jsonBuffer.length, 0x4e4f534a),
      jsonBuffer,
      chunkHeader(binBuffer.length, 0x004e4942),
      binBuffer,
    ]);
  }
}

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function chunkHeader(length, type) {
  const header = Buffer.alloc(8);
  header.writeUInt32LE(length, 0);
  header.writeUInt32LE(type, 4);
  return header;
}

function padTo4(buffer, fill) {
  const padding = (4 - (buffer.length % 4)) % 4;
  return padding === 0 ? buffer : Buffer.concat([buffer, Buffer.alloc(padding, fill)]);
}

function axisMin(positions) {
  return [0, 1, 2].map((axis) => {
    let value = Infinity;
    for (let i = axis; i < positions.length; i += 3) value = Math.min(value, positions[i]);
    return value;
  });
}

function axisMax(positions) {
  return [0, 1, 2].map((axis) => {
    let value = -Infinity;
    for (let i = axis; i < positions.length; i += 3) value = Math.max(value, positions[i]);
    return value;
  });
}

/** Quaternion for a rotation of `deg` around the X axis (limb swing). */
function quatX(deg) {
  const half = (deg * Math.PI) / 360;
  return [Math.sin(half), 0, 0, Math.cos(half)];
}

// ── The character ──────────────────────────────────────────────────────

/**
 * A blocky humanoid: torso, head, two arms, two legs. Deliberately simple
 * and readable — LAB A3 measures stability and cost, not art. It stands
 * about 1 unit tall, which matches MindAR's convention of normalising a
 * target to 1 unit wide, so it lands at a sensible size on the card.
 */
function buildCharacter(builder, { segments, rings }) {
  const skin = builder.addMaterial("skin", [0.94, 0.76, 0.62]);
  const shirt = builder.addMaterial("shirt", [0.25, 0.73, 0.31]);
  const pants = builder.addMaterial("pants", [0.16, 0.24, 0.38]);

  const headMesh = builder.addMesh("head", sphere(0.17, segments, rings), skin);
  const torsoMesh = builder.addMesh("torso", box(0.34, 0.4, 0.18), shirt);
  const armMesh = builder.addMesh("arm", box(0.1, 0.34, 0.1), skin);
  const legMesh = builder.addMesh("leg", box(0.12, 0.36, 0.12), pants);

  // Limbs are parented so their pivot sits at the shoulder/hip: rotating
  // a node rotates around its own origin, so the mesh is offset downward
  // inside a pivot node rather than the geometry being pre-translated.
  const armLPivot = builder.addNode({ name: "armL", translation: [-0.22, 0.62, 0], children: [] });
  const armRPivot = builder.addNode({ name: "armR", translation: [0.22, 0.62, 0], children: [] });
  const legLPivot = builder.addNode({ name: "legL", translation: [-0.09, 0.36, 0], children: [] });
  const legRPivot = builder.addNode({ name: "legR", translation: [0.09, 0.36, 0], children: [] });

  const armLMesh = builder.addNode({ mesh: armMesh, translation: [0, -0.17, 0] });
  const armRMesh = builder.addNode({ mesh: armMesh, translation: [0, -0.17, 0] });
  const legLMesh = builder.addNode({ mesh: legMesh, translation: [0, -0.18, 0] });
  const legRMesh = builder.addNode({ mesh: legMesh, translation: [0, -0.18, 0] });

  builder.json.nodes[armLPivot].children = [armLMesh];
  builder.json.nodes[armRPivot].children = [armRMesh];
  builder.json.nodes[legLPivot].children = [legLMesh];
  builder.json.nodes[legRPivot].children = [legRMesh];

  const torso = builder.addNode({ mesh: torsoMesh, translation: [0, 0.56, 0] });
  const head = builder.addNode({ mesh: headMesh, translation: [0, 0.87, 0] });

  const root = builder.addNode({
    name: "character",
    translation: [0, 0, 0],
    children: [torso, head, armLPivot, armRPivot, legLPivot, legRPivot],
  });
  builder.json.scenes[0].nodes = [root];

  const cycle = [0, 0.25, 0.5, 0.75, 1];

  // Idle: a slow bob plus a barely-there arm sway. Chosen so that any
  // wobble seen on-device is tracking jitter, not the animation — an idle
  // that moves a lot would mask exactly what this lab measures.
  builder.addAnimation("Idle", [
    {
      node: root,
      path: "translation",
      times: [0, 0.75, 1.5],
      values: [0, 0, 0, 0, 0.015, 0, 0, 0, 0],
    },
    {
      node: armLPivot,
      path: "rotation",
      times: [0, 0.75, 1.5],
      values: [...quatX(4), ...quatX(-4), ...quatX(4)],
    },
    {
      node: armRPivot,
      path: "rotation",
      times: [0, 0.75, 1.5],
      values: [...quatX(-4), ...quatX(4), ...quatX(-4)],
    },
  ]);

  // Walk: a full limb swing — the stress case for both animation cost and
  // perceived stability.
  builder.addAnimation("Walk", [
    {
      node: legLPivot,
      path: "rotation",
      times: cycle,
      values: [...quatX(30), ...quatX(0), ...quatX(-30), ...quatX(0), ...quatX(30)],
    },
    {
      node: legRPivot,
      path: "rotation",
      times: cycle,
      values: [...quatX(-30), ...quatX(0), ...quatX(30), ...quatX(0), ...quatX(-30)],
    },
    {
      node: armLPivot,
      path: "rotation",
      times: cycle,
      values: [...quatX(-25), ...quatX(0), ...quatX(25), ...quatX(0), ...quatX(-25)],
    },
    {
      node: armRPivot,
      path: "rotation",
      times: cycle,
      values: [...quatX(25), ...quatX(0), ...quatX(-25), ...quatX(0), ...quatX(25)],
    },
    {
      node: root,
      path: "translation",
      times: cycle,
      values: [0, 0, 0, 0, 0.03, 0, 0, 0, 0, 0, 0.03, 0, 0, 0, 0],
    },
  ]);
}

// ── Run ────────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });

for (const variant of VARIANTS) {
  const builder = new GltfBuilder();
  buildCharacter(builder, variant);
  const glb = builder.toGlb();
  const path = join(OUT_DIR, variant.name + ".glb");
  writeFileSync(path, glb);

  const triangles = builder.json.meshes.reduce((total, mesh) => {
    const accessor = builder.json.accessors[mesh.primitives[0].indices];
    return total + accessor.count / 3;
  }, 0);

  console.log(
    variant.name.padEnd(18) +
      String(Math.round(glb.length / 1024)).padStart(6) +
      " KB   " +
      String(triangles).padStart(7) +
      " tris",
  );
}
