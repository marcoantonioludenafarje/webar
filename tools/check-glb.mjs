/**
 * Structural validation for the generated GLBs.
 *
 * A malformed GLB fails silently-ish: A-Frame logs to a console the
 * operator cannot see and the target simply shows nothing. That failure
 * would surface only with a phone in hand pointed at a card — the most
 * expensive place in this workspace to discover a bug (PLAYBOOK §23.4).
 * So the invariants a loader relies on are checked here instead.
 *
 * Usage: node tools/check-glb.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MODELS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "models");

const COMPONENT_SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const COMPONENT_COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

let failures = 0;

function check(condition, message) {
  if (!condition) {
    console.log("  FAIL  " + message);
    failures += 1;
  }
}

function parseGlb(buffer) {
  check(buffer.toString("ascii", 0, 4) === "glTF", "magic is not glTF");
  check(buffer.readUInt32LE(4) === 2, "version is not 2");
  check(buffer.readUInt32LE(8) === buffer.length, "header length != file length");

  let offset = 12;
  let json = null;
  let bin = null;

  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    check(start + length <= buffer.length, "chunk overruns the file");

    if (type === 0x4e4f534a) json = JSON.parse(buffer.toString("utf8", start, start + length));
    else if (type === 0x004e4942) bin = buffer.subarray(start, start + length);

    check(length % 4 === 0, "chunk length is not 4-byte aligned");
    offset = start + length;
  }

  check(json !== null, "no JSON chunk");
  check(bin !== null, "no BIN chunk");
  return { json, bin };
}

function validate(name, buffer) {
  console.log("\n" + name);
  const before = failures;
  const { json, bin } = parseGlb(buffer);
  if (!json || !bin) return;

  check(json.asset?.version === "2.0", "asset.version is not 2.0");
  check(json.buffers?.length === 1, "expected exactly one buffer");
  check(
    json.buffers[0].byteLength <= bin.length,
    "buffer.byteLength (" + json.buffers[0].byteLength + ") exceeds BIN chunk (" + bin.length + ")",
  );
  check(json.buffers[0].uri === undefined, "GLB buffer must not have a uri");

  // Every bufferView must sit inside the BIN chunk.
  json.bufferViews.forEach((view, index) => {
    check(
      view.byteOffset + view.byteLength <= bin.length,
      "bufferView " + index + " overruns the BIN chunk",
    );
  });

  // Every accessor must fit inside its bufferView, and be aligned to its
  // component size — three.js creates typed-array views directly over the
  // buffer and throws on a misaligned offset.
  json.accessors.forEach((accessor, index) => {
    const view = json.bufferViews[accessor.bufferView];
    check(view !== undefined, "accessor " + index + " references a missing bufferView");
    if (!view) return;

    const elementSize = COMPONENT_SIZE[accessor.componentType] * COMPONENT_COUNT[accessor.type];
    check(
      elementSize * accessor.count <= view.byteLength,
      "accessor " + index + " (" + accessor.type + " x" + accessor.count + ") overruns its bufferView",
    );
    check(
      view.byteOffset % COMPONENT_SIZE[accessor.componentType] === 0,
      "accessor " + index + " is not aligned to its component size",
    );
    check(accessor.count > 0, "accessor " + index + " is empty");
  });

  // POSITION accessors require min/max per spec.
  json.meshes.forEach((mesh, meshIndex) => {
    mesh.primitives.forEach((primitive) => {
      const position = json.accessors[primitive.attributes.POSITION];
      check(
        Array.isArray(position?.min) && Array.isArray(position?.max),
        "mesh " + meshIndex + " POSITION accessor lacks min/max",
      );
      check(
        json.materials[primitive.material] !== undefined,
        "mesh " + meshIndex + " references a missing material",
      );

      // Indices must address existing vertices — an out-of-range index is
      // the classic way to get a blank render with no error.
      const indices = json.accessors[primitive.indices];
      const view = json.bufferViews[indices.bufferView];
      const data = bin.subarray(view.byteOffset, view.byteOffset + view.byteLength);
      const array =
        indices.componentType === 5125
          ? new Uint32Array(data.buffer, data.byteOffset, indices.count)
          : new Uint16Array(data.buffer, data.byteOffset, indices.count);

      let max = 0;
      for (const value of array) if (value > max) max = value;
      check(
        max < position.count,
        "mesh " + meshIndex + " index " + max + " >= vertex count " + position.count,
      );
      check(indices.count % 3 === 0, "mesh " + meshIndex + " index count is not a multiple of 3");
      check(
        indices.componentType === 5123 ? position.count <= 65536 : true,
        "mesh " + meshIndex + " uses 16-bit indices but has more than 65536 vertices",
      );
    });
  });

  // Scene graph sanity.
  check(json.scenes[json.scene]?.nodes?.length > 0, "root scene has no nodes");
  json.nodes.forEach((node, index) => {
    (node.children ?? []).forEach((child) => {
      check(json.nodes[child] !== undefined, "node " + index + " references missing child " + child);
      check(child !== index, "node " + index + " is its own child");
    });
  });

  // Animations: channels must target real nodes, and rotation outputs must
  // be unit quaternions or the model will shear.
  json.animations.forEach((animation) => {
    check(animation.channels.length > 0, "animation " + animation.name + " has no channels");
    animation.channels.forEach((channel) => {
      check(
        json.nodes[channel.target.node] !== undefined,
        "animation " + animation.name + " targets a missing node",
      );
      const sampler = animation.samplers[channel.sampler];
      const input = json.accessors[sampler.input];
      const output = json.accessors[sampler.output];
      check(
        Array.isArray(input.min) && Array.isArray(input.max),
        "animation " + animation.name + " input accessor lacks min/max",
      );
      check(
        input.count === output.count,
        "animation " + animation.name + " has " + input.count + " keyframes but " + output.count + " values",
      );

      if (channel.target.path === "rotation") {
        check(output.type === "VEC4", "rotation output is not VEC4");
        const view = json.bufferViews[output.bufferView];
        const data = bin.subarray(view.byteOffset, view.byteOffset + view.byteLength);
        const values = new Float32Array(data.buffer, data.byteOffset, output.count * 4);
        for (let i = 0; i < output.count; i += 1) {
          const [x, y, z, w] = values.subarray(i * 4, i * 4 + 4);
          const length = Math.sqrt(x * x + y * y + z * z + w * w);
          check(
            Math.abs(length - 1) < 1e-3,
            "animation " + animation.name + " keyframe " + i + " is not a unit quaternion (|q|=" + length.toFixed(4) + ")",
          );
        }
      } else {
        check(output.type === "VEC3", channel.target.path + " output is not VEC3");
      }
    });
  });

  const clips = json.animations.map((a) => a.name).join(", ");
  console.log(
    "  " +
      (failures === before ? "OK" : "CON FALLAS") +
      "  ·  " +
      json.meshes.length +
      " meshes · " +
      json.nodes.length +
      " nodes · clips: " +
      clips,
  );
}

const files = readdirSync(MODELS_DIR).filter((file) => file.endsWith(".glb"));
check(files.length > 0, "no .glb files found — run tools/make-character.mjs first");
for (const file of files) validate(file, readFileSync(join(MODELS_DIR, file)));

console.log(failures === 0 ? "\nTodos los GLB son válidos.\n" : "\n" + failures + " problemas.\n");
process.exit(failures === 0 ? 0 : 1);
