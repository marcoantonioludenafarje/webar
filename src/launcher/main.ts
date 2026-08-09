/**
 * WebAR Lab launcher (§7).
 *
 * Lists every experiment defined in CLAUDE.md. Only demos with a `path`
 * are implemented; the rest render as "NOT IMPLEMENTED" per §7 — no fake
 * implementations, no dead links.
 */
interface DemoEntry {
  number: string;
  title: string;
  path?: string;
}

const demos: DemoEntry[] = [
  { number: "01", title: "Camera", path: "./src/demos/demo-01-camera/index.html" },
  { number: "02", title: "Image Tracking", path: "./src/demos/demo-02-tracking/index.html" },
  { number: "03", title: "3D Character" },
  { number: "04", title: "Interaction" },
  { number: "05", title: "AR Game" },
  { number: "06", title: "Business Configuration" },
  { number: "07", title: "Multi Target" },
];

function render(): void {
  const app = document.getElementById("app");
  if (!app) return;

  const cardsHtml = demos
    .map((demo) => {
      const status = demo.path
        ? `<a class="btn btn-primary" href="${demo.path}">Launch</a>`
        : `<span class="status-pill">NOT IMPLEMENTED</span>`;
      return `
        <div class="card demo-card">
          <div class="demo-card-title">${demo.number} ${demo.title}</div>
          <div class="demo-card-action">${status}</div>
        </div>
      `;
    })
    .join("");

  app.innerHTML = `
    <div class="page">
      <div class="page-header">
        <span class="eyebrow">WebAR Lab</span>
        <h1>Experiments</h1>
      </div>
      <div class="demo-list">${cardsHtml}</div>
    </div>
  `;
}

render();
