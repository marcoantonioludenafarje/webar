import type { GuidedSession, SessionView } from "./GuidedSession";
import type { EvidenceSample, Primitive } from "./types";

/**
 * GuidedPanel — the on-screen half of a guided session.
 *
 * Built for someone holding a phone at arm's length pointed at a card:
 * one instruction at a time, large touch targets, and live feedback so
 * they can tell whether they are moving the right way without looking
 * away from the target. Everything else (stats, debug overlay) stays
 * where it was — this panel overlays the bottom of the screen only while
 * a session is running.
 *
 * It renders; it does not decide. All step logic lives in GuidedSession.
 */

export interface GuidedPanelOptions {
  /** Last sample, used to freeze context when a manual step resolves. */
  latestSample: () => EvidenceSample | null;
  /** Fields to capture alongside a manual answer. */
  contextFields: string[];
  /** Called when every step is resolved and the operator confirms. */
  onFinish: (operatorNotes: string) => void;
}

export class GuidedPanel {
  private readonly root = document.createElement("div");
  private noteDraft = "";
  private finalNotes = "";

  constructor(
    private readonly session: GuidedSession,
    private readonly options: GuidedPanelOptions,
  ) {
    this.root.className = "guided-panel";
    this.root.hidden = true;
    this.session.onChange((view) => this.render(view));
    this.root.addEventListener("click", (event) => this.onClick(event));
    this.root.addEventListener("input", (event) => this.onInput(event));
  }

  mount(container: HTMLElement = document.body): void {
    container.appendChild(this.root);
    this.render(this.session.view());
  }

  private onInput(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.id === "guided-note") {
      this.noteDraft = (target as HTMLTextAreaElement).value;
    } else if (target.id === "guided-final-notes") {
      this.finalNotes = (target as HTMLTextAreaElement).value;
    }
  }

  private onClick(event: Event): void {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const context = this.session.captureContext(
      this.options.latestSample(),
      this.options.contextFields,
    );

    if (action === "pass") this.resolveWith("pass", this.noteDraft, context);
    else if (action === "fail") this.resolveWith("fail", this.noteDraft, context);
    else if (action === "skip") this.resolveWith("skipped", this.noteDraft, context);
    else if (action === "choice") {
      this.resolveWith("pass", button.dataset.value ?? "", context);
    } else if (action === "finish") {
      this.options.onFinish(this.finalNotes);
    }
  }

  private resolveWith(
    outcome: "pass" | "fail" | "skipped",
    note: string,
    context: Record<string, Primitive>,
  ): void {
    this.noteDraft = "";
    this.session.resolve(outcome, note.trim(), context);
  }

  private render(view: SessionView): void {
    if (view.phase === "idle") {
      this.root.hidden = true;
      return;
    }
    this.root.hidden = false;

    if (view.phase === "done") {
      this.root.innerHTML = this.renderDone(view);
      return;
    }

    const step = view.step;
    if (!step) return;

    const progress = "Paso " + (view.index + 1) + " de " + view.total;
    const bar =
      '<div class="guided-bar"><div class="guided-bar-fill" style="width:' +
      Math.round(view.holdProgress * 100) +
      '%"></div></div>';

    let controls: string;
    if (step.choices) {
      controls =
        '<div class="guided-actions">' +
        step.choices
          .map(
            (choice) =>
              '<button class="btn" data-action="choice" data-value="' +
              escapeAttr(choice) +
              '">' +
              escapeHtml(choice) +
              "</button>",
          )
          .join("") +
        "</div>";
    } else if (step.auto) {
      // Auto steps resolve themselves. The bail-out only appears after the
      // timeout: offering "mark as failed" immediately invites resolving a
      // step that simply needed a few more seconds.
      controls =
        '<div class="guided-hint">' +
        (view.hint ? escapeHtml(view.hint) : "esperando lectura…") +
        "</div>" +
        bar +
        (view.timedOut
          ? '<div class="guided-actions">' +
            '<button class="btn btn-danger" data-action="fail">No lo logro — marcar como falla</button>' +
            '<button class="btn" data-action="skip">Omitir</button>' +
            "</div>"
          : "");
    } else {
      controls =
        '<div class="guided-actions">' +
        '<button class="btn btn-primary" data-action="pass">Sí</button>' +
        '<button class="btn btn-danger" data-action="fail">No</button>' +
        '<button class="btn" data-action="skip">Omitir</button>' +
        "</div>";
    }

    const noteField = step.askNote
      ? '<textarea id="guided-note" class="guided-note" rows="2" placeholder="Nota (opcional) — qué viste, qué te molestó">' +
        escapeHtml(this.noteDraft) +
        "</textarea>"
      : "";

    this.root.innerHTML =
      '<div class="guided-head">' +
      '<span class="guided-progress">' +
      progress +
      "</span>" +
      '<span class="guided-fills">' +
      escapeHtml(step.fills) +
      "</span>" +
      "</div>" +
      '<div class="guided-label">' +
      escapeHtml(step.label) +
      "</div>" +
      noteField +
      controls;
  }

  private renderDone(view: SessionView): string {
    const passed = view.results.filter((result) => result.outcome === "pass").length;
    const failed = view.results.filter((result) => result.outcome === "fail").length;
    const skipped = view.results.filter((result) => result.outcome === "skipped").length;

    return (
      '<div class="guided-head"><span class="guided-progress">Sesión completa</span></div>' +
      '<div class="guided-label">' +
      passed +
      " OK · " +
      failed +
      " fallaron · " +
      skipped +
      " omitidos" +
      "</div>" +
      '<textarea id="guided-final-notes" class="guided-note" rows="3" placeholder="¿Algo que te sorprendió, molestó o se vio mal? Esto es lo que ninguna métrica captura.">' +
      escapeHtml(this.finalNotes) +
      "</textarea>" +
      '<div class="guided-actions">' +
      '<button class="btn btn-primary" data-action="finish">Descargar reporte</button>' +
      "</div>"
    );
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}
