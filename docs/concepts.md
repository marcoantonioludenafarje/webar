# Conceptos — WebAR Lab

Teoría específica de esta exploración que aplica a **más de un lab** (la
teoría de un solo lab vive en su propio `labs/mindar-aframe/lab-NN-*/README.md`
§1). Para conceptos de tooling que no son específicos de WebAR (git
worktrees, GitHub CLI, GitHub Pages, Claude Artifacts), ver
[laboratorios/docs/conceptos-generales/](https://github.com/marcoantonioludenafarje/laboratorios/tree/master/docs/conceptos-generales).

## A-Frame + MindAR — cómo encajan

```text
Navegador
   │
getUserMedia (LAB A1) ──────► <video> stream
   │
MindAR (LAB A2) ─────────────► estima pose del target en cada frame
   │
A-Frame ──────────────────────► renderiza contenido 3D anclado a esa pose
   │
Three.js (indirecto, vía A-Frame)
```

- **A-Frame** es un framework declarativo sobre Three.js: describe una
  escena 3D con HTML custom elements (`<a-scene>`, `<a-entity>`, ...).
- **MindAR** se integra como un componente de A-Frame (`mindar-image`,
  `mindar-image-target`) que además de manejar tracking, toma control de
  la cámara internamente — por eso `CameraService` (LAB A1) no se reutiliza
  en LAB A2 en adelante.
- **Three.js** nunca se toca directamente mientras A-Frame sea suficiente
  (ver ROADMAP.md — evaluar integración directa solo si A-Frame resulta
  una limitación real, no antes).

## Compositing de cámara + AR (el bug de LAB A2)

Para que el contenido 3D se vea "sobre" el video de cámara en tiempo real,
MindAR posiciona el `<video>` detrás del canvas de A-Frame con
`z-index: -2`, confiando en que el canvas por encima sea transparente.
Cualquier CSS que introduzca un nuevo contexto de apilamiento
(`z-index` explícito) en un ancestro de ese canvas puede romper este
truco — ver `docs/decisions.md` DECISION 003 para el caso real que
ocurrió aquí.
