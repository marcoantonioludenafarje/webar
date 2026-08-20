# LAB A4 — Interaction

> Sigue la plantilla de [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md) §6.
> Código: [`src/labs/lab-04-interaction/`](../../../src/labs/lab-04-interaction/) · Sitio en vivo: [Launch](https://marcoantonioludenafarje.github.io/webar/src/labs/lab-04-interaction/index.html)
> Depende de: [LAB A3](../lab-03-3d-character/) (implementado, pendiente de prueba física — ver §2).

## 1. Contexto teórico

**Raycasting** es cómo se convierte un toque en pantalla en una pregunta
sobre la escena 3D: se lanza un rayo desde la cámara a través del punto
tocado y se pregunta qué geometría atraviesa.

```text
Toque (x, y en píxeles CSS)
      │
      ▼
Coordenadas normalizadas (-1..1, Y invertido)
      │
      ▼
Rayo desde la cámara  ──►  intersección con la jerarquía del modelo
      │
      ▼
hit / miss  +  distancia  +  a cuántos píxeles del objeto cayó
```

- **Qué resuelve**: dar a objetos 3D el comportamiento de elementos de UI
  sin necesidad de colisionadores físicos ni un motor de juego.
- **Qué NO resuelve**: no dice nada sobre *ergonomía*. Un rayo que acierta
  perfectamente sobre un objeto de 20 píxeles sigue siendo imposible de
  tocar para un pulgar de 40.
- **El detalle que importa**: el eje Y va invertido entre pantalla y
  coordenadas normalizadas. Si ese signo se rompe, los toques aciertan en
  la mitad equivocada y en el celular se lee como *"el hit-test es poco
  confiable"* — no como un bug. Por eso `toNormalisedDevice` está cubierto
  por `npm test`.

## 2. Relación con el objetivo final

```text
Objetivo final: motor WebAR para negocios físicos
     │
     ▼
Necesitamos: que el cliente pueda TOCAR la experiencia, no solo mirarla
     │
     ├── ¿acierta cuando apunta? ────► tasa de acierto
     ├── ¿responde rápido? ─────────► latencia
     └── ¿responde de más? ─────────► falsos positivos
     │
     ▼
Raycasting sobre el objeto anclado (este lab)
```

Sin interacción confiable, DEMO 4 (recompensa simulada) y LAB A5 (mini
juego) no tienen base.

**Sobre la dependencia de A3** (PLAYBOOK §23.5): A4 se implementó sin
esperar la validación física de A3, y no asume sus resultados. Usa el
modelo chico de forma fija — A3 existe para medir el costo del asset, y
variarlo acá confundiría las cifras de interacción con la carga de render.
Si A3 revela que el jitter es inaceptable, A4 no se invalida: la tasa de
acierto medida sobre un objeto que tiembla **es** el dato relevante.

## 3. Pregunta / hipótesis

> ¿Pueden los objetos aumentados comportarse como elementos de UI
> interactivos, no solo visualizaciones pasivas?

La respuesta útil no es *"los toques funcionan"* — es **a qué distancia del
objeto hay que tocar antes de que responda de forma confiable**. Un
booleano hit/miss no puede producir eso; la distancia en píxeles entre el
toque y el objeto proyectado sí, y convierte "la interacción se siente
poco confiable" en un número accionable: *hacer el área de toque de N px*.

## 4. Demo

- **Arquitectura mínima**: [`ScreenRaycaster`](../../../src/core/ar/ScreenRaycaster.ts)
  (hit-test + proyección + resumen) sobre el mismo `<a-scene>` de MindAR,
  con el personaje de A3 y `ModelAnimator` para la reacción.
- **Respuesta al toque**: el personaje cambia de clip, el marcador de score
  sube, y el teléfono vibra si el navegador lo soporta.
- **Marcadores de toque**: cada toque deja un punto —
  <span>verde</span> acertó, <span>rojo</span> falló. Vistos juntos muestran
  la *forma* del área de acierto: un grupo de rojos justo debajo del
  personaje significa algo muy distinto de rojos dispersos, y esa
  diferencia es invisible en un porcentaje.
- **Archivos**: [`src/labs/lab-04-interaction/`](../../../src/labs/lab-04-interaction/), [`src/core/ar/ScreenRaycaster.ts`](../../../src/core/ar/ScreenRaycaster.ts).

### Qué se cuenta como toque

Solo los toques cuyo destino es el `<canvas>` de AR. El overlay HTML está
en `pointer-events: none` y solo el chrome real vuelve a aceptar entrada,
así que **ningún botón puede contarse como un toque fallido**. Sin eso, la
tasa de acierto sería basura.

### Cómo se mide la latencia

Desde `event.timeStamp` del `pointerdown` hasta el primer frame después de
aplicar la reacción. Cubre despacho del evento, hit-test y nuestro trabajo.

**No cubre composición ni el refresco de la pantalla** — la página no puede
observarlos. No es latencia glass-to-glass; el número real que percibe una
persona es mayor. Por eso §8 también pregunta cómo *se sintió*.

## 5. Pasos manuales

**Ruta recomendada — sesión guiada** (~5 min): tres tandas de toques, cada
una midiendo algo que las otras no pueden.

| Tanda | Qué mide | Qué es "bien" |
|---|---|---|
| 10 toques **al personaje** | tasa de acierto, latencia | acierto alto |
| 5 toques **al lado** | falsos positivos | acierto **bajo** |
| 5 toques **desde ~1 m** | acierto con el objeto chico en pantalla | acierto alto |

La segunda tanda existe porque un área de toque lo bastante generosa para
sentirse bien y una lo bastante generosa para dispararse sin querer **son
el mismo ajuste**. Midiendo solo la primera, un hit box demasiado ansioso
parecería un éxito.

El contador se reinicia al empezar cada tanda, así las tres cifras son
independientes.

**Ruta manual**: Start → apuntar al target → tocar el personaje → leer las
métricas y usar *Reiniciar conteo* entre pruebas.

## 6. Qué debemos observar

```text
Si el acierto es alto y el fallo más cercano está lejos  → el área de toque es correcta.
Si el acierto es bajo pero los fallos caen a pocos px    → falta área, no precisión.
Si "al lado" también acierta mucho                       → el hit box es demasiado generoso.
Si el acierto cae a 1 metro                              → un área en píxeles fijos no escala.
Si la latencia medida es baja pero se siente lenta       → el problema es la animación de respuesta.
Si no vibra                                              → el navegador no soporta háptica (iOS Safari).
```

## 7. Criterios de aceptación

- [ ] Tocar el personaje dispara una reacción visible.
- [ ] La tasa de acierto queda medida en las tres tandas.
- [ ] La latencia mediana y p90 quedan medidas.
- [ ] Los falsos positivos quedan medidos (tanda "al lado").
- [ ] La distancia de los fallos queda registrada en píxeles.
- [ ] Ningún toque sobre botones se cuenta como toque fallido.
- [ ] El FPS se mantiene usable durante la interacción.

## 8. Reflexiones del laboratorio

<!-- OBLIGATORIO tras la prueba física. No fabricar resultados. -->
<!-- Se llena con el reporte que emite la sesión guiada. -->

**Entorno de prueba** — Device: _____ · Browser: _____ · OS: _____ · Viewport: _____ · DPR: _____

**Medido**:

| Tanda | Toques | Acierto | Latencia mediana | p90 | Fallo más cercano |
|---|---|---|---|---|---|
| Al personaje | | | | | |
| Al lado (falsos positivos) | | | | | |
| A ~1 metro | | | | | |

- ¿Vibración soportada? (`vibrationSupported`):
- Latencia percibida vs. medida:
- ¿Se sintió natural, o hubo que apuntar con cuidado?:

**¿Qué aprendimos? ¿Qué problema resuelve realmente? ¿Qué NO resuelve?
¿Qué limitaciones encontramos? ¿Qué riesgos? ¿Qué pasaría en producción
con usuarios que no saben dónde tocar? ¿Qué alternativa podría resolverlo
mejor? ¿Existe una capacidad nativa que haga innecesario construir algo
propio?**

_(completar tras la prueba física)_

## 9. Impacto sobre la arquitectura final

- [ ] ADOPTAR
- [ ] SEGUIR EXPLORANDO
- [ ] COMPARAR
- [ ] REEMPLAZAR
- [ ] DESCARTAR

_(pendiente de prueba física)_
