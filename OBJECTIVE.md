# Objective — WebAR Lab

Sigue la estructura de [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md) §1-3.

## Problema / oportunidad

Queremos saber si WebAR (AR en el navegador, sin app nativa) es
suficientemente estable, performante e interactiva como para justificar
construir un producto comercial para negocios físicos — antes de
invertir en diseñar esa arquitectura final.

## Objetivo final

Validar experimentalmente si un **motor WebAR configurable** puede ofrecer
una experiencia de realidad aumentada interactiva y suficientemente
estable en smartphones de consumo, sin requerir una app móvil nativa.

```text
Cliente en un negocio físico (restaurante, café, retail, evento)
   │
   ▼
Abre la cámara del navegador, apunta a un elemento físico
   │
   ▼
Experiencia AR interactiva (personaje, juego, información de marca)
   │
   ├── Tracking de imagen
   ├── Renderizado 3D animado
   ├── Interacción táctil
   ├── Mecánica de juego simple
   ├── Configuración por negocio (sin tocar el motor)
   │
   ▼
Motor WebAR (MindAR + A-Frame)
```

Este diagrama es una VISIÓN, no la arquitectura definitiva — esa surge de
los experimentos (ver `ARCHITECTURE-V1.md`, todavía no existe).

## Preguntas principales

1. ¿Qué tan confiable es el acceso a cámara en navegadores móviles?
2. ¿Qué tan confiable es el tracking de imagen (MindAR)?
3. ¿A qué distancias y ángulos se degrada el tracking?
4. ¿Cuánto jitter visible existe en un modelo 3D animado anclado al target?
5. ¿Se puede tocar/interactuar de forma confiable con un objeto AR?
6. ¿Puede correr un mini-juego AR con buen framerate?
7. ¿El mismo motor puede configurarse para distintos negocios sin
   duplicar implementación?
8. ¿Pueden participar múltiples targets físicos en una sola experiencia?
9. ¿Cuáles son las limitaciones tecnológicas reales (no supuestas)?
10. ¿WebAR es suficientemente fuerte como para justificar un producto?

## Experiencia deseada

Un cliente físico apunta su cámara del celular (sin instalar nada) a un
elemento de la tienda/restaurante, y ve una experiencia de marca
interactiva — personaje animado, mini-juego, recompensa simulada — que se
siente estable y fluida, no como una demo técnica frágil.
