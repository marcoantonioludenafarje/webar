# Validación pendiente

Cola de lo que **solo un humano puede confirmar**. Ver
[PLAYBOOK §23](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md)
— la validación física no bloquea el avance, se acumula aquí.

Ordenada por **cuánto avance libera por minuto de humano**, no por número
de lab.

## Cómo se usa

1. Agarrás un bloque cuando tengas el rato.
2. Corrés la sesión guiada; el sistema captura la evidencia solo.
3. Descargás el reporte y me lo pasás.
4. Yo lleno §8 y §9 del lab, `docs/findings.md` y el `CATALOGO`.

Nada de anotar mediciones a mano — si un dato exige transcripción manual,
eso es un bug del arnés, no una tarea tuya.

---

## Bloque 1 — LAB A1 + A2 en celular

| | |
|---|---|
| **Estado** | ⏳ pendiente |
| **Requiere** | celular + el target `card.png` impreso (o en otra pantalla) |
| **Tiempo estimado** | ~10 min |
| **Desbloquea** | A1, A2 → y con eso el CATALOGO de "cámara" y "tracking de imagen" |
| **Link** | https://marcoantonioludenafarje.github.io/webar/ |

Se cierra con una sola sesión guiada. Lo que el sistema mide solo:
cámara trasera real, resolución, curva de FPS, distancia y ángulo al
target, luminancia ambiente, movimiento, latencia de adquisición y
recuperación, y si el navegador mata el stream en background.

Lo que te va a preguntar (no es deducible): oclusión parcial, target en
movimiento, tamaño impreso del target, y el juicio subjetivo — jitter,
incomodidad, calentamiento del teléfono.

### Evidencia ya capturada

- `demo-01-camera-1786300027410.json` (9-ago) — **desktop Windows**, 3 min,
  1280x720, sin errores, `facingMode: unknown`. Sirve como control de
  escritorio; **no** valida A1, que pregunta explícitamente por la cámara
  trasera de un celular.

---

## Bloque 2 — LAB A3 en celular

| | |
|---|---|
| **Estado** | ⏳ pendiente |
| **Requiere** | el mismo target del bloque 1 |
| **Tiempo estimado** | ~6 min |
| **Desbloquea** | A3 → y con eso el presupuesto de assets para A4/A5 |
| **Link** | https://marcoantonioludenafarje.github.io/webar/src/labs/lab-03-3d-character/index.html |

Se puede encadenar con el bloque 1 en la misma salida — mismo target, mismo
teléfono. La sesión **cambia los tres modelos sola** y mide carga,
transferencia, FPS y jitter de cada uno.

Lo que te pregunta: si el personaje se ve parado (la orientación no es
deducible de la pose), si el cambio de animación pega un salto, si tembló a
ojo, y si el teléfono se calentó.

⚠ Si tu teléfono no expone acelerómetro o le negás el permiso de
movimiento, el reporte va a marcar `jitterGateEnforced: false`: las
lecturas de jitter siguen sirviendo pero son evidencia más débil, porque no
se pudo verificar que el teléfono estuviera quieto al medirlas.

### Riesgo conocido, sin validar

La orientación del personaje sobre la tarjeta (`rotation="90 0 0"`) se
derivó de la convención de ejes de MindAR, no se vio funcionando. Si
aparece **acostado sobre la tarjeta o hundido detrás**, el signo está
invertido — decilo y es un cambio de un carácter.

---

## Bloque 3 — LAB A4 en celular

| | |
|---|---|
| **Estado** | ⏳ pendiente |
| **Requiere** | el mismo target de los bloques anteriores |
| **Tiempo estimado** | ~5 min |
| **Desbloquea** | A4 → y con eso LAB A5 (mini-juego) y DEMO 4 |
| **Link** | https://marcoantonioludenafarje.github.io/webar/src/labs/lab-04-interaction/index.html |

Tres tandas de toques: al personaje, deliberadamente al lado, y desde un
metro. Cada toque deja un punto verde o rojo en pantalla, así que la forma
del área de acierto se ve mientras probás.

Lo que te pregunta: si la respuesta se sintió inmediata (la latencia medida
no incluye composición ni refresco de pantalla, así que el número real es
mayor), si vibró, y si tuviste que apuntar con cuidado.

---

## Historial

*(los bloques validados se mueven acá con la fecha y el link a su finding)*
