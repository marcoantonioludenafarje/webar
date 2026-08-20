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

## Historial

*(los bloques validados se mueven acá con la fecha y el link a su finding)*
