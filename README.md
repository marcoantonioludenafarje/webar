# WebAR Lab

Una exploración técnica de realidad aumentada en el navegador (WebAR),
parte del índice general en
[laboratorios](https://marcoantonioludenafarje.github.io/laboratorios/).
Ver [CLAUDE.md](./CLAUDE.md) para lo específico de este repo,
[OBJECTIVE.md](./OBJECTIVE.md) para el objetivo final, y
[ROADMAP.md](./ROADMAP.md) para qué labs existen y en qué orden — este
README solo cubre cómo correr el código.

Etapa: **validación tecnológica / proof of concept**. No es un producto.
Ver [docs/findings.md](./docs/findings.md) y [docs/decisions.md](./docs/decisions.md) para lo que ya se sabe.

## Requisitos

- Node.js 18+ y npm
- Un navegador móvil para pruebas físicas (los labs de cámara no se
  validan de forma significativa solo en desktop)
- HTTPS o `localhost` — los navegadores solo dan acceso a cámara en
  contextos seguros

## Empezar

```bash
npm install
npm run dev
```

Abre la URL local que imprime. Para probar en el celular, usa el flag
`--host` de Vite y asegúrate de que el celular esté en la misma red:

```bash
npm run dev -- --host
```

El acceso a cámara sobre `http://<ip-de-red>` sin más será bloqueado por
la mayoría de navegadores móviles a menos que sea `localhost`. Si hace
falta, usa un túnel (ej. `ngrok`) para tener una URL HTTPS de prueba en
dispositivo físico.

## Cómo probar en tu celular (paso a paso, sin saber código)

1. Abre en tu celular: **https://marcoantonioludenafarje.github.io/webar/**
2. Toca el lab que quieras (`Launch`).
3. Para labs de tracking (A2+), ten el target a mano: impreso o en **otra
   pantalla** — el link directo está en el README de ese lab.
4. Toca **Sesion guiada + reporte** y acepta el permiso de cámara.
5. Segui las instrucciones que aparecen abajo, una por vez. Los pasos que
   el sistema puede medir solo (distancia, ángulo, luz, movimiento) avanzan
   cuando la condición se cumple; los que no, te preguntan.
6. Al terminar, toca **Descargar reporte** — bajan dos archivos: el JSON
   con la evidencia cruda y un `.md` listo para pegar.

No necesitas saber programar ni anotar nada a mano. Si un dato te exige
transcribirlo, eso es un bug del arnés (`src/core/evidence/`), no una
tarea tuya — ver [PLAYBOOK §23.4](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md).

El botón **Start** manual sigue estando para explorar sin sesión guiada.

## Estructura del proyecto

```text
OBJECTIVE.md          objetivo final, preguntas, visión
ROADMAP.md             qué labs existen, en qué orden, qué preguntan
docs/
  concepts.md           teoría que cruza varios labs
  findings.md            qué resolvió cada tecnología (al cerrar cada lab)
  decisions.md            registro de decisiones arquitectónicas

labs/mindar-aframe/       documentación de cada lab (teoría, hipótesis, pasos, reflexiones)
  lab-01-camera/README.md
  lab-02-image-tracking/README.md
  ...

demos-integrales/         documentación de cada demo integral
  demo-01-business-config/README.md
  demo-02-multi-target/README.md

src/
  core/                   servicios reutilizables (camera, metrics, ...)
  labs/                   código real de cada lab, un HTML entry point cada uno
  launcher/                página raíz (lista todos los labs/demos)
  shared/                  CSS compartido
```

Cada lab es un entry point HTML independiente de Vite (ver
`vite.config.ts`), así que los labs ya implementados siguen funcionando
sin importar qué se agregue después.

## Labs disponibles

| Lab | Nombre | Estado | Doc |
|---|---|---|---|
| A1 | Camera | Implementado | [labs/mindar-aframe/lab-01-camera](./labs/mindar-aframe/lab-01-camera/) |
| A2 | Image Tracking | Implementado | [labs/mindar-aframe/lab-02-image-tracking](./labs/mindar-aframe/lab-02-image-tracking/) |
| A3 | 3D Character | No implementado | [labs/mindar-aframe/lab-03-3d-character](./labs/mindar-aframe/lab-03-3d-character/) |
| A4 | Interaction | No implementado | [labs/mindar-aframe/lab-04-interaction](./labs/mindar-aframe/lab-04-interaction/) |
| A5 | AR Game | No implementado | [labs/mindar-aframe/lab-05-ar-game](./labs/mindar-aframe/lab-05-ar-game/) |
| Demo 1 | Business Configuration | No implementado | [demos-integrales/demo-01-business-config](./demos-integrales/demo-01-business-config/) |
| Demo 2 | Multi Target | No implementado | [demos-integrales/demo-02-multi-target](./demos-integrales/demo-02-multi-target/) |

## Lab A2 — target de imagen

LAB A2 trae de fábrica el target de ejemplo oficial de MindAR
(`public/targets/lab-02-image-tracking/card.mind` + `card.png` imprimible)
para poder probar el flujo de inmediato. Para tu propio target físico,
compílalo en https://hiukim.github.io/mind-ar-js-doc/tools/compile y
reemplaza `card.mind` (o apunta `mindar-image="imageTargetSrc: ..."` en
`src/labs/lab-02-image-tracking/index.html` a un archivo nuevo).

## Registrar resultados

La sesión guiada emite el reporte; ese reporte alimenta la sección
"8. Reflexiones del laboratorio" del `README.md` del lab en
`labs/mindar-aframe/`.

No fabricar resultados — que el código corra en el navegador no es lo
mismo que una validación AR exitosa en el celular. Un campo `no medido` en
el reporte se queda `no medido`.

Lo que falta validar está en
[VALIDACION-PENDIENTE.md](./VALIDACION-PENDIENTE.md). Esa cola no bloquea
el avance del repo (PLAYBOOK §23): un lab queda `IMPLEMENTADO` hasta que
alguien lo prueba en hardware real, nunca `CERRADO`.

## Build y verificación

```bash
npm run build     # tsc estricto + vite build
npm test          # matemática de pose, jitter y tendencia de FPS
npm run models    # regenera y valida los GLB de LAB A3
```

`npm test` cubre los cálculos de los que dependen las conclusiones de los
labs. No reemplaza la validación física: que la matemática sea correcta no
significa que la capacidad AR funcione en un celular (PLAYBOOK §23.2).
