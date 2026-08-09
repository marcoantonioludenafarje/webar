# LAB A2 — Image Tracking

> Sigue la plantilla de [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md) §6.
> Código: [`src/labs/lab-02-image-tracking/`](../../../src/labs/lab-02-image-tracking/) · Sitio en vivo: [Launch](https://marcoantonioludenafarje.github.io/webar-lab/src/labs/lab-02-image-tracking/index.html)
> Depende de: [LAB A1 — Camera](../lab-01-camera/) (validado a nivel de código; pendiente de prueba física).

## 1. Contexto teórico

MindAR es una librería de tracking de imagen basada en TensorFlow.js: toma
el stream de cámara, detecta un patrón de features de una imagen objetivo
(compilada a un archivo `.mind`) y devuelve la pose (posición/rotación)
del target en cada frame, para anclar contenido 3D encima vía A-Frame.

- **Qué es**: tracking de imagen 100% en el navegador, sin backend, sin
  marcadores especiales (funciona sobre cualquier imagen con suficiente
  contraste/detalle).
- **Qué problema resuelve**: saber *dónde* está una imagen física en el
  espacio de la cámara, cuadro a cuadro.
- **Componentes principales**: compilador de target (imagen → `.mind`,
  offline), el estimador de pose (en tiempo real), la integración con
  A-Frame (`mindar-image`, `mindar-image-target`).
- **Qué NO hace**: no reconoce objetos 3D ni superficies (eso es tracking
  de superficie/SLAM, otra tecnología); no funciona con imágenes de bajo
  contraste o muy repetitivas.
- **Alternativas**: AR.js (más simple, menos preciso), WebXR nativo
  (soporte de navegador todavía limitado en 2026).

## 2. Relación con el objetivo final

```text
Objetivo final: motor WebAR para negocios físicos
     │
     ▼
Necesitamos: reconocer un elemento físico de la tienda (logo, empaque, cartel)
     │
     ▼
MindAR image tracking (este lab)
```

## 3. Pregunta / hipótesis

> ¿Qué tan confiable se puede reconocer y seguir una imagen impresa física
> bajo condiciones realistas (distancia, ángulo, luz, oclusión, movimiento)?

## 4. Demo

- **Arquitectura mínima**: A-Frame + MindAR vía `<script>` CDN (setup oficial
  de MindAR, sin bundler). Un cubo primitivo anclado al target — no un
  personaje (mantener el lab simple). Reutiliza `MetricsService` +
  `DebugOverlay` del LAB A1 sin cambios (su segunda validación real) + un
  `EventLog` nuevo (log de eventos en pantalla, porque el celular no tiene
  DevTools).
- **Archivos**: [`src/labs/lab-02-image-tracking/`](../../../src/labs/lab-02-image-tracking/), target de ejemplo en
  [`public/targets/lab-02-image-tracking/`](../../../public/targets/lab-02-image-tracking/) (logo de MindAR, MIT license — reemplazable por
  un target propio compilado en
  [hiukim.github.io/mind-ar-js-doc/tools/compile](https://hiukim.github.io/mind-ar-js-doc/tools/compile)).
- **Estados expuestos**: `SEARCHING` → `TARGET FOUND` → `TARGET LOST` (vuelve a `SEARCHING`).
- **Resultado esperado**: al apuntar la cámara al target, aparece un cubo
  verde + texto "TARGET FOUND" anclado a la imagen.

## 5. Pasos manuales

1. Imprimir `public/targets/lab-02-image-tracking/card.png`, o mostrarlo
   en otra pantalla.
2. Abrir el lab en el celular, dar **Start**, aceptar permiso de cámara.
3. Apuntar al target — confirmar transición SEARCHING → TARGET FOUND.
4. Sacar el target de cuadro y volver a meterlo — confirmar TARGET LOST se
   cuenta y la reacquisición funciona.
5. Recorrer la matriz de prueba física (§6).
6. **Export metrics JSON** después de cada condición si es útil.

## 6. Qué debemos observar — matriz de prueba física

| Condición | Resultado |
|---|---|
| 20 cm | |
| 50 cm | |
| 1 metro | |
| frontal | |
| ángulo 30° | |
| ángulo 60° | |
| luz baja | |
| luz fuerte | |
| oclusión parcial | |
| cámara en movimiento | |
| target en movimiento | |

```text
Si el tracking se pierde a distancias/ángulos razonables → limitación real, documentar el umbral.
Si la reacquisición tarda mucho tras TARGET LOST → afecta la sensación de fluidez del producto final.
Si el FPS cae fuerte con tracking activo → posible cuello de botella para labs posteriores (3D animado).
```

## 7. Criterios de aceptación

- [ ] El target se reconoce de forma confiable a distancia/ángulo normales.
- [ ] Los tres estados (SEARCHING/FOUND/LOST) son correctos y visibles.
- [ ] El tiempo de adquisición y recuperación quedan medidos.
- [ ] El FPS se mantiene en un rango usable con tracking activo.
- [ ] La matriz de prueba física está completa, con datos reales (no inventados).

## 8. Reflexiones del laboratorio

<!-- OBLIGATORIO tras la prueba física. No fabricar resultados. -->

**Entorno de prueba** — Device: _____ · Browser: _____ · OS: _____ · Lighting: _____ · Tamaño del target: _____

**Medido**:
- Tiempo de adquisición (primera SEARCHING → FOUND):
- Target found count:
- Target lost count:
- Tiempo de recuperación (última LOST → FOUND):
- FPS estimado con tracking activo:

**¿Qué aprendimos? ¿Qué problema resuelve realmente? ¿Qué NO resuelve?
¿Qué limitaciones encontramos? ¿Qué alternativa podría resolverlo mejor?**

_(completar tras la prueba física)_

## 9. Impacto sobre la arquitectura final

- [ ] ADOPTAR
- [ ] SEGUIR EXPLORANDO
- [ ] COMPARAR
- [ ] REEMPLAZAR
- [ ] DESCARTAR

_(pendiente de prueba física)_

---

## Nota de depuración (proceso, no resultado del experimento)

Durante la implementación se encontraron y corrigieron dos bugs de capas
CSS que impedían ver el feed de cámara (pantalla negra pese a que MindAR
funcionaba). Detalle completo en `docs/decisions.md` — relevante si un lab
futuro también combina A-Frame + overlay HTML propio.
