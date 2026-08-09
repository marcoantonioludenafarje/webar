# LAB A3 — 3D Character (NOT IMPLEMENTED)

> Depende de: [LAB A2 — Image Tracking](../lab-02-image-tracking/) (implementado, pendiente de prueba física).
> Sigue [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md) §6 al implementarse. Este stub preserva el
> plan original antes de la reestructura del 9 ago 2026.

## Pregunta / hipótesis

> ¿Puede un personaje 3D animado (GLB/glTF) mantenerse visualmente estable
> y performante mientras se sigue en WebAR?

## Capacidades requeridas

- cargar modelo GLB,
- anclar el modelo al target de imagen,
- reproducir animación,
- cambiar de animación si el modelo tiene varios clips,
- ajustar escala/posición/rotación.

## Panel de ajuste (development controls)

```text
AR LAB

Scale        [------●---------]
Position X   [---------●------]
Position Y   [----●-----------]
Rotation     [----------●-----]
Animation    [ Idle ] [ Dance ] [ Jump ]
```

## Qué evaluar

- tiempo de carga del modelo,
- jitter percibido,
- fluidez de la animación,
- FPS,
- impacto del tamaño del asset,
- estabilidad del tracking con contenido animado encima.
