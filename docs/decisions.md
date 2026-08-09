# Decisiones — WebAR Lab

Sigue [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md) §16.

## DECISION 001

### Contexto

Necesitábamos servir el sitio en un link público para pruebas físicas en
celular sin depender de que la laptop y el celular estén en la misma red.

### Opciones

A. GitHub Pages (repo público)
B. GitHub Pages (repo privado)
C. Vercel/Netlify con repo privado

### Evidencia obtenida

GitHub Pages en el plan free **rechaza por completo** repos privados
(`"Your current plan does not support GitHub Pages for this repository"`,
HTTP 422) — no es una degradación de privacidad, es un bloqueo total.

### Decisión

A — repo público + GitHub Pages vía GitHub Actions.

### Razón

Simplicidad (sin cuenta/servicio adicional), sin costo, y el contenido
(demos técnicas experimentales, sin datos de negocio real) no amerita el
overhead de una alternativa privada.

---

## DECISION 002

### Contexto

MindAR + A-Frame necesitan cargarse en el navegador. Vite/npm permite
bundlearlos como módulos ES, pero MindAR distribuye su build de A-Frame
como script clásico pensado para `<script src>`.

### Opciones

A. `<script>` CDN (jsdelivr), como documenta el propio MindAR
B. Importar como paquete npm y bundlear con Vite

### Evidencia obtenida

El quickstart oficial de MindAR (hiukim.github.io/mind-ar-js-doc) usa
exclusivamente CDN scripts, sin build step, y así está probado por sus
propios ejemplos.

### Decisión

A — CDN scripts, versiones fijadas (`aframe@1.5.0`, `mind-ar@1.2.5`).

### Razón

Menor riesgo: seguir el setup que la librería garantiza que funciona, en
vez de replicar su inicialización interna vía imports de módulo.

---

## DECISION 003

### Contexto

Tras remover el atributo `embedded` de `<a-scene>` (que causaba un layout
roto — franja negra + canvas gigante recortado, confirmado con prueba
física), se dejó una regla CSS defensiva (`#ar-scene { position: fixed
!important; z-index: 0; ... }`) "por si acaso". Una segunda prueba física
mostró pantalla negra de nuevo, pese a que el `<video>` de la cámara
confirmadamente tenía frames reales (diagnosticado vía consola:
`readyState: 4`, `videoWidth/Height` correctos).

### Opciones

A. Seguir ajustando CSS por prueba y error
B. Comparar contra el ejemplo oficial de MindAR y remover cualquier CSS que ellos no necesiten

### Evidencia obtenida

El ejemplo oficial de MindAR no usa **ningún** CSS custom en `<a-scene>` y
funciona. Nuestra regla defensiva introducía un `z-index: 0` explícito que
rompía el truco de compositing que usa MindAR (`<video>` a `z-index: -2`,
transparente detrás del canvas AR).

### Decisión

B — se removió la regla CSS por completo.

### Razón

Cuando una librería documenta un setup que funciona sin configuración
extra, agregar CSS "de seguridad" sin necesidad probada es la fuente del
bug, no la solución. Lección aplicable a labs futuros que combinen A-Frame
con overlays HTML propios: confiar primero en el comportamiento default
de la librería, no envolverlo preventivamente.

---

## DECISION 004

### Contexto

El repo empezó con una estructura propia (`CLAUDE.md` con toda la
metodología embebida, `demos/demo-NN-*`, `experiment-results/*.md`) antes
de que existiera [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md) como estructura consolidada
para todas las exploraciones bajo `ideas_negocio/`.

### Opciones

A. Mantener la estructura original de webar (funcionaba)
B. Migrar a `labs/<tecnologia>/lab-NN/` + `demos-integrales/` + `OBJECTIVE.md`/`ROADMAP.md`, igual que `agent-remote-labs`

### Evidencia obtenida

Con solo 2 labs implementados, el costo de migrar es bajo. Los demos 06/07
originales (Business Configuration, Multi Target) ya eran conceptualmente
integraciones de los demos 01-05 — mapean naturalmente a
`demos-integrales/` sin forzar nada.

### Decisión

B — reestructurado (9 ago 2026).

### Razón

Consistencia entre todas las exploraciones bajo `ideas_negocio/` — un
humano (o agente) que abre cualquier exploración encuentra la misma forma,
sin tener que aprender la convención particular de cada repo.
