/**
 * WebAR Lab launcher.
 *
 * Lists every lab / demo integral defined in ROADMAP.md. Only entries with
 * a `path` are implemented; the rest render as "NOT IMPLEMENTED" — no fake
 * implementations, no dead links (see laboratorios/PLAYBOOK.md §7).
 */
interface Entry {
  id: string;
  title: string;
  path?: string;
}

const labs: Entry[] = [
  { id: "A1", title: "Camera", path: "./src/labs/lab-01-camera/index.html" },
  { id: "A2", title: "Image Tracking", path: "./src/labs/lab-02-image-tracking/index.html" },
  { id: "A3", title: "3D Character" },
  { id: "A4", title: "Interaction" },
  { id: "A5", title: "AR Game" },
];

const demosIntegrales: Entry[] = [
  { id: "1", title: "Business Configuration" },
  { id: "2", title: "Multi Target" },
];

function renderSection(title: string, entries: Entry[]): string {
  const cardsHtml = entries
    .map((entry) => {
      const status = entry.path
        ? `<a class="btn btn-primary" href="${entry.path}">Launch</a>`
        : `<span class="status-pill">NOT IMPLEMENTED</span>`;
      return `
        <div class="card demo-card">
          <div class="demo-card-title">${entry.id} ${entry.title}</div>
          <div class="demo-card-action">${status}</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="page-header" style="margin-top: 8px;">
      <span class="eyebrow">${title}</span>
    </div>
    <div class="demo-list">${cardsHtml}</div>
  `;
}

function render(): void {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div class="page">
      <div class="page-header">
        <span class="eyebrow">WebAR Lab</span>
        <h1>MindAR + A-Frame</h1>
      </div>
      ${renderSection("Labs", labs)}
      ${renderSection("Demos Integrales", demosIntegrales)}
      <p style="font-size: 13px; color: var(--text-dim);">
        Parte del índice general en
        <a href="https://marcoantonioludenafarje.github.io/laboratorios/" target="_blank" rel="noopener">laboratorios</a>.
      </p>
    </div>
  `;
}

render();
