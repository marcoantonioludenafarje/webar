# LAB A5 — AR Mini Game (NOT IMPLEMENTED)

> Depende de: [LAB A4 — Interaction](../lab-04-interaction/) (no implementado).
> Sigue [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md) §6 al implementarse. Este stub preserva el
> plan original antes de la reestructura del 9 ago 2026.

## Pregunta / hipótesis

> ¿Puede WebAR sostener un mini-juego de gamificación simple con buen
> comportamiento?

## Juego: Catch AR

```text
TIME 20
SCORE 0

      CHARACTER

Tap character
      ↓
+1 point
      ↓
character changes position
```

Al terminar el tiempo:

```text
GAME OVER

SCORE: 23

GOLD LEVEL

Demo Reward:
FREE FRIES

[ PLAY AGAIN ]
```

La recompensa es puramente simulada — sin backend, sin sistema de premios
real.

## Requerimientos del juego

- duración configurable,
- score, timer,
- estados: start / playing / game-over,
- restart,
- interacción AR,
- feedback visual.

## Qué evaluar

- FPS antes vs. durante el juego,
- latencia de interacción,
- interrupciones de tracking,
- comportamiento del juego tras recuperar el tracking.
