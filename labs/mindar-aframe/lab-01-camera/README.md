# LAB A1 — Camera

> Sigue la plantilla de [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md) §6.
> Código: [`src/labs/lab-01-camera/`](../../../src/labs/lab-01-camera/) · Sitio en vivo: [Launch](https://marcoantonioludenafarje.github.io/webar-lab/src/labs/lab-01-camera/index.html)

## 1. Contexto teórico

`getUserMedia` es la API nativa del navegador para pedir acceso a cámara y
micrófono. En un contexto AR, es la base de todo lo demás: si el
navegador no puede sostener un stream de cámara trasera de forma
confiable, ninguna capa encima (tracking, render 3D) importa.

- **Qué es**: API web estándar (`navigator.mediaDevices.getUserMedia`),
  soportada por todos los navegadores móviles modernos.
- **Qué problema resuelve**: acceso a hardware de cámara sin instalar una
  app nativa.
- **Cómo funciona conceptualmente**: el navegador pide permiso al usuario,
  y si se otorga, entrega un `MediaStream` que se puede mostrar en un
  `<video>` o pasar a un pipeline de procesamiento (en labs posteriores,
  MindAR toma este stream directamente).
- **Qué NO hace**: no garantiza una resolución específica, no controla
  exposición/foco manualmente, no funciona sin HTTPS o `localhost`.
- **Alternativas**: ninguna relevante — es la única vía nativa de acceso a
  cámara en un navegador.

## 2. Relación con el objetivo final

```text
Objetivo final: motor WebAR para negocios físicos
     │
     ▼
Necesitamos: acceso confiable a cámara trasera en el celular del cliente
     │
     ▼
getUserMedia (este lab)
```

Si esto falla o es poco confiable, todo lo demás (Objective.md) queda sin
base.

## 3. Pregunta / hipótesis

> ¿Puede el navegador acceder y mantener de forma confiable un stream de
> cámara trasera para una experiencia AR?

## 4. Demo

- **Arquitectura mínima**: `CameraService` (start/stop, prefiere
  `facingMode: environment`, mapea errores de `getUserMedia` a códigos
  legibles) + `MetricsService`/`DebugOverlay` (FPS, duración de sesión,
  export JSON local).
- **Archivos**: [`src/labs/lab-01-camera/`](../../../src/labs/lab-01-camera/), [`src/core/camera/CameraService.ts`](../../../src/core/camera/CameraService.ts), [`src/core/metrics/`](../../../src/core/metrics/).
- **Comandos**: `npm run dev` desde la raíz del repo, o abrir el sitio en vivo.
- **Flujo**: Start → permiso de cámara → stream visible + métricas → Stop.
- **Resultado esperado**: cámara trasera visible de fondo, FPS/resolución/facing
  actualizándose en vivo, sin errores.

## 5. Pasos manuales

1. Abrir el lab en el celular (no alcanza con desktop — ver §6).
2. Dar **Start**, aceptar el permiso de cámara.
3. Confirmar que es la cámara trasera, no la frontal.
4. Leer FPS/Resolución/Facing en pantalla y el overlay de debug.
5. Dejar el stream corriendo varios minutos — vigilar caídas de FPS,
   congelamientos, o que el navegador mate el stream en segundo plano.
6. Dar **Stop**, confirmar que el stream se detiene y el preview
   desaparece.
7. Repetir Start/Stop varias veces.
8. Opcional: denegar el permiso una vez para confirmar que el error es
   entendible.
9. **Export metrics JSON** para guardar evidencia.

## 6. Qué debemos observar

```text
Si el stream se mantiene estable varios minutos → confirma viabilidad básica.
Si el FPS cae significativamente con el tiempo → limitación de batería/térmica a investigar.
Si el navegador mata el stream en background → limitación de plataforma, documentar.
Si el error de permiso denegado es incomprensible → hay que mejorar el mensaje antes de seguir.
```

## 7. Criterios de aceptación

- [ ] La cámara arranca exitosamente.
- [ ] La cámara se mantiene activa varios minutos sin degradarse.
- [ ] Start/Stop funciona de forma confiable, repetidamente.
- [ ] Los errores son visibles y comprensibles.
- [ ] Las métricas de debug son visibles.
- [ ] El lab funciona de forma independiente (sin AR/tracking encima).

## 8. Reflexiones del laboratorio

<!-- OBLIGATORIO tras la prueba física. No fabricar resultados. -->

**Entorno de prueba** — Device: _____ · Browser: _____ · OS: _____ · Lighting: _____

**Medido**:
- Start latency:
- Resolución de cámara:
- Facing mode:
- FPS estimado (estable):
- Duración de sesión probada:
- Errores encontrados:

**¿Qué aprendimos? ¿Qué problema resuelve realmente? ¿Qué NO resuelve?
¿Qué limitaciones encontramos? ¿Qué riesgos/implicaciones de seguridad
existen? ¿Existe una capacidad nativa que haga innecesario construir algo
propio?**

_(completar tras la prueba física)_

## 9. Impacto sobre la arquitectura final

- [ ] ADOPTAR
- [ ] SEGUIR EXPLORANDO
- [ ] COMPARAR
- [ ] REEMPLAZAR
- [ ] DESCARTAR

_(pendiente de prueba física)_
