# Roadmap — WebAR Lab

Sigue [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md) §9. Ver [OBJECTIVE.md](./OBJECTIVE.md) para el objetivo final.

## Tecnología

Una sola tecnología base bajo evaluación en esta exploración: **MindAR +
A-Frame** (WebAR vía tracking de imagen). Three.js se usa indirectamente a
través de A-Frame. Integración directa con Three.js queda como experimento
separado si A-Frame resulta una limitación real.

## Matriz de laboratorios

| Lab | Nombre | Pregunta que responde | Resultado esperado | Estado |
|---|---|---|---|---|
| A1 | [Camera](./labs/mindar-aframe/lab-01-camera/) | ¿Puede el navegador acceder y mantener de forma confiable un stream de cámara trasera? | Cámara estable, start/stop confiable, métricas visibles | Implementado, pendiente de prueba física |
| A2 | [Image Tracking](./labs/mindar-aframe/lab-02-image-tracking/) | ¿Qué tan confiable es MindAR reconociendo y siguiendo una imagen impresa? | Estados SEARCHING/FOUND/LOST, matriz de distancia/ángulo/luz | Implementado, pendiente de prueba física |
| A3 | 3D Character | ¿Puede un personaje 3D animado (GLB) mantenerse estable y performante anclado al target? | FPS, jitter, tiempo de carga documentados | No implementado |
| A4 | Interaction | ¿Puede un objeto AR comportarse como un elemento de UI interactivo (tap, feedback)? | Latencia de interacción, tasa de fallos de raycasting | No implementado |
| A5 | AR Game | ¿Puede correr un mini-juego AR simple (Catch AR) con buen framerate? | FPS antes/durante el juego, recuperación tras pérdida de tracking | No implementado |

Máximo 5 labs para esta tecnología — no 3, porque el objetivo final
(negocios físicos) tiene varias capacidades independientes que vale la
pena aislar antes de integrarlas (cámara, tracking, render 3D,
interacción, gamificación son válidas por separado).

## Estado de validación

Los labs A1 y A2 están **implementados y desplegados**, no validados: nadie
los probó todavía en un celular. Ese pendiente vive en
[VALIDACION-PENDIENTE.md](./VALIDACION-PENDIENTE.md) y **no bloquea** el
avance del roadmap (PLAYBOOK §23) — con el límite de §23.5: A3 puede
implementarse, pero no puede asumir en su diseño una estabilidad de
tracking que A2 todavía no confirmó.

Para que esa validación cueste lo menos posible, ambos labs traen una
**sesión guiada** (`src/core/evidence/`) que captura la evidencia sola y
emite un reporte descargable.

## Demos integrales

| Demo | Nombre | Combina | Objetivo |
|---|---|---|---|
| 1 | Business Configuration | A1-A5 | ¿El mismo motor puede producir experiencias de negocio distintas solo cambiando configuración (`config.json`), sin duplicar código? |
| 2 | Multi Target | Demo 1 + tracking múltiple | ¿Pueden varios targets físicos participar en una sola experiencia con estabilidad aceptable? |

No saltar directo a las demos integrales — cada una depende de que los
labs de los que se compone ya estén implementados y probados físicamente
(ver [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md) §5.1, "No implementar todos los
experimentos a la vez").

## Progresión obligatoria

```text
A1 Camera → A2 Image Tracking → A3 3D Character → A4 Interaction → A5 AR Game
                                                                        │
                                                                        ▼
                                              Demo 1 Business Config → Demo 2 Multi Target
```

## Condiciones de parada

Si un experimento revela una limitación mayor (tracking inestable, FPS
inaceptable, incompatibilidad de navegador severa, tiempos de carga
excesivos, interacción táctil poco confiable, jitter inaceptable,
problemas de memoria) — detener, documentar el hallazgo en
`docs/findings.md`, identificar la causa probable, y proponer el
experimento mínimo para confirmarla antes de seguir. Ver
[laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md) §7 para buenas prácticas de seguridad si el
lab involucra permisos/credenciales.
