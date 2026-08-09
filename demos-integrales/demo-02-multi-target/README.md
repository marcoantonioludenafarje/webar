# DEMO INTEGRAL 2 — Multi Target (NOT IMPLEMENTED)

> Combina: [DEMO INTEGRAL 1 — Business Configuration](../demo-01-business-config/) + tracking múltiple.
> Sigue [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md), sección "DEMO INTEGRAL". Este stub
> preserva el plan original (antes Demo 07) antes de la reestructura del
> 9 ago 2026. No saltar directo a este demo — CLAUDE.md original insistía en
> no adelantarse aquí sin instrucción explícita.

## Objetivo

> ¿Pueden varios targets de imagen física participar en una sola
> experiencia WebAR con estabilidad y performance aceptables?

## Concepto inicial

Tres targets:

```text
Target A → Character
Target B → Treasure
Target C → Trophy
```

## Experiencia de ejemplo

```text
TREASURE HUNT

Find:

[ ] Character
[ ] Treasure
[ ] Trophy

0 / 3
```

Al detectar cada target:

```text
[x] Character
[x] Treasure
[ ] Trophy

2 / 3
```

Al completar:

```text
ALL TARGETS FOUND

EXPERIMENT COMPLETE
```

## Qué evaluar

- capacidad de tracking simultáneo,
- cambio entre targets,
- reacquisición,
- FPS,
- carga de assets,
- persistencia de estado,
- movimiento del usuario por el espacio físico.
