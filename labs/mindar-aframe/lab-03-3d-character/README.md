# LAB A3 — 3D Character

> Sigue la plantilla de [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md) §6.
> Código: [`src/labs/lab-03-3d-character/`](../../../src/labs/lab-03-3d-character/) · Sitio en vivo: [Launch](https://marcoantonioludenafarje.github.io/webar/src/labs/lab-03-3d-character/index.html)
> Depende de: [LAB A2](../lab-02-image-tracking/) (implementado, pendiente de prueba física — ver §2).

## 1. Contexto teórico

**glTF/GLB** es el formato estándar de la web para modelos 3D: geometría,
materiales, jerarquía de nodos y animaciones en un solo archivo. `.glb` es
su variante binaria — un contenedor con un bloque JSON y un bloque de bytes.

- **Qué es**: formato de transmisión de escenas 3D, mantenido por Khronos.
  Lo que PNG es a las imágenes, glTF pretende ser a los modelos.
- **Qué problema resuelve**: entregar un modelo listo para renderizar sin
  conversión en el cliente. El JSON describe la escena; el binario tiene
  vértices, normales e índices con el layout que la GPU espera.
- **Cómo funciona la animación**: cada clip declara *canales*, y cada canal
  apunta a una propiedad de un nodo (`rotation`, `translation`, `scale`)
  con una lista de keyframes. Un *mixer* interpola entre ellos por frame.

```text
GLB
 ├── JSON: nodos, meshes, materiales, animaciones
 └── BIN:  posiciones, normales, índices, keyframes
                    │
                    ▼
        three.js AnimationMixer  ──►  pose por frame
                    │
                    ▼
        anclado al target de MindAR
```

- **Qué NO hace**: glTF no define cómo *anclar* nada al mundo real — eso es
  del tracker. Tampoco garantiza performance: un GLB válido puede ser
  imposible de mover en un celular.
- **Alternativas**: USDZ (ecosistema Apple, sin soporte web abierto), FBX
  (pesado, propietario, pensado para authoring), OBJ (sin animación).

**Nota sobre el mixer**: A-Frame 1.5 no trae reproductor de clips — lo
habitual es sumar `aframe-extras`. Acá se maneja `THREE.AnimationMixer`
directo desde [`ModelAnimator`](../../../src/core/ar/ModelAnimator.ts), unas
cuarenta líneas, para no agregar una tercera dependencia CDN a un lab cuyo
objeto es justamente medir costos.

## 2. Relación con el objetivo final

```text
Objetivo final: motor WebAR para negocios físicos
     │
     ▼
Necesitamos: contenido de marca creíble anclado a un elemento físico
     │
     ├── que no tiemble  ──────► ¿cuánto jitter hay realmente?
     ├── que cargue rápido ────► ¿cuánto cuesta el asset?
     └── que no funda el equipo ► ¿qué le hace al FPS?
     │
     ▼
GLB animado sobre target trackeado (este lab)
```

Es la primera vez que la exploración pone contenido *que a un cliente le
importaría* sobre el target. A2 demostró que un cubo se puede anclar; un
cubo perdona el jitter que un personaje no.

**Sobre la dependencia de A2** (PLAYBOOK §23.5): este lab se implementó sin
esperar la validación física de A2, pero **no asume** ninguno de sus
resultados. Nada acá depende de que el tracking sea estable a determinada
distancia — al contrario, mide cuánto lo es con un personaje encima. Si A2
resulta inestable a un metro, este lab no se cae: lo habrá medido.

## 3. Pregunta / hipótesis

> ¿Puede un personaje 3D animado (GLB) mantenerse visualmente estable y
> performante mientras está anclado a un target trackeado?

Tres sub-preguntas, cada una con su medición:

| Sub-pregunta | Cómo se responde |
|---|---|
| ¿Cuánto tiembla? | jitter RMS y pico, en mm |
| ¿Cuánto cuesta el asset? | mismo personaje a tres pesos, transferencia vs. parse |
| ¿Qué le hace al FPS? | curva de FPS por variante y por clip |

## 4. Demo

- **Arquitectura mínima**: `ModelAnimator` (mixer de three, cambio de clip)
  + `JitterProbe` (estabilidad) + `TargetPose` (distancia/ángulo) sobre el
  mismo `<a-scene>` de MindAR de A2, más la instrumentación compartida
  (`MetricsService`, `DebugOverlay`, `EventLog`, `core/evidence/`).
- **Archivos**: [`src/labs/lab-03-3d-character/`](../../../src/labs/lab-03-3d-character/), [`src/core/ar/`](../../../src/core/ar/).
- **Modelos**: generados, no descargados —
  [`tools/make-character.mjs`](../../../tools/make-character.mjs) emite el
  mismo personaje a tres teselados (16 KB / 120 KB / 833 KB). Generarlos
  permite que el **tamaño sea la única variable** entre las tres
  mediciones, y evita el problema de licencia de un modelo ajeno.
  [`tools/check-glb.mjs`](../../../tools/check-glb.mjs) valida la
  estructura antes de que el archivo llegue a un teléfono.
- **Comandos**: `npm run models` (regenerar y validar), `npm run dev`,
  `npm test` (matemática de pose y jitter).
- **Flujo**: Start → target → personaje parado sobre la tarjeta → cambiar
  modelo/clip → ajustar escala/altura/giro → medir.

```text
Target trackeado
      │
      ├── pose ──► JitterProbe ──► temblor RMS/pico
      │
      └── wrapper ──► GLB ──► ModelAnimator ──► clip actual
                                   │
                                   ▼
                             FPS, load, transfer
```

- **Resultado esperado**: el personaje se para sobre la tarjeta, animado, y
  las cuatro métricas se actualizan en vivo.

## 5. Pasos manuales

**Ruta recomendada — sesión guiada** (~6 min, no hay que anotar nada):

1. Tener el target de A2 impreso o en otra pantalla.
2. Abrir el lab en el celular y tocar **Sesion guiada + reporte**.
3. Seguir las instrucciones. La sesión **cambia los modelos sola** entre
   pasos — comparar 16 KB contra 833 KB solo significa algo si nada más
   cambió entre las dos lecturas, y eso no se puede garantizar dejando que
   la persona toque los chips en cualquier orden.
4. **Descargar reporte** al final.

**Ruta manual**: Start → apuntar al target → tocar los chips de modelo y de
animación → mover los sliders de escala/altura/giro.

## 6. Qué debemos observar

```text
Si el jitter medido es bajo pero se ve mal      → el problema es de escala/altura, no de tracking.
Si el jitter sube con el modelo grande          → el costo de render está afectando al tracker.
Si el FPS cae fuerte solo con el modelo grande  → hay presupuesto de asset, y hay que medirlo.
Si el FPS cae con cualquier modelo              → el cuello es el pipeline AR, no el asset.
Si el cambio de clip pega un salto              → problema de mixer, no de tracking.
Si el personaje aparece acostado o hundido      → la convención de ejes del anchor está mal.
```

**Jitter medido vs. jitter percibido son findings distintos.** Un temblor
de 0.4 mm puede ser invisible o evidente según el modelo. Por eso el
reporte trae los dos: el número y lo que vio la persona.

### Sobre la validez de la medición de jitter

`JitterProbe` no mide la varianza de la posición — eso mediría sobre todo
la mano del operador. Mide el **residuo de alta frecuencia** contra un
promedio móvil corto: el movimiento suave se cancela, el temblor no.

Verificado en `npm test`: una deriva lineal da exactamente 0, y el mismo
temblor con una deriva grande encima lee igual que el temblor solo
(ratio 1.00).

**Limitación conocida**: la cancelación es exacta solo para velocidad
constante. El movimiento curvo se filtra en proporción a amplitud × ω², un
11% de la señal en el caso sintético más agresivo. Por eso la sesión
guiada **exige acelerómetro por debajo de 0.55 m/s²** antes de tomar una
lectura. Si el dispositivo no expone acelerómetro, la sesión igual avanza
pero el reporte marca `jitterGateEnforced: false` — la evidencia es más
débil y hay que saberlo.

## 7. Criterios de aceptación

- [ ] El GLB carga y el personaje aparece anclado al target.
- [ ] El personaje se ve parado, no acostado ni hundido en la tarjeta.
- [ ] Los dos clips (`Idle`, `Walk`) existen y se pueden alternar.
- [ ] El cambio de clip no produce un salto visible.
- [ ] El jitter queda medido en mm, con el gate de quietud activo.
- [ ] Las tres variantes de modelo quedan medidas (carga, transferencia, FPS).
- [ ] El FPS con el modelo chico se mantiene en rango usable.
- [ ] Los sliders de escala/altura/giro afectan al modelo en vivo.

## 8. Reflexiones del laboratorio

<!-- OBLIGATORIO tras la prueba física. No fabricar resultados. -->
<!-- Se llena con el reporte que emite la sesión guiada. -->

**Entorno de prueba** — Device: _____ · Browser: _____ · OS: _____ · Lighting: _____ · Target: _____

**Medido**:

| Variante | Carga (ms) | Transferencia | FPS | Jitter RMS (mm) | Jitter pico (mm) |
|---|---|---|---|---|---|
| Small (16 KB) | | | | | |
| Medium (120 KB) | | | | | |
| Large (833 KB) | | | | | |

- Clips encontrados:
- ¿El cambio de clip fue limpio?:
- ¿Gate de quietud activo? (`jitterGateEnforced`):
- Jitter percibido (lo que vio la persona):

**¿Qué aprendimos? ¿Qué problema resuelve realmente? ¿Qué NO resuelve?
¿Qué capacidades sorprendieron? ¿Qué limitaciones encontramos? ¿Qué
riesgos? ¿Qué pasaría en producción con assets reales y datos móviles?
¿Qué alternativa podría resolverlo mejor? ¿Existe una capacidad nativa que
haga innecesario construir algo propio?**

_(completar tras la prueba física)_

## 9. Impacto sobre la arquitectura final

- [ ] ADOPTAR
- [ ] SEGUIR EXPLORANDO
- [ ] COMPARAR
- [ ] REEMPLAZAR
- [ ] DESCARTAR

_(pendiente de prueba física)_
