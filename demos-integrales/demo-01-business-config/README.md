# DEMO INTEGRAL 1 — Business Configuration (NOT IMPLEMENTED)

> Combina: LAB A1-A5 (todos deben estar implementados y probados primero).
> Sigue [laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md), sección "DEMO INTEGRAL". Este stub
> preserva el plan original (antes Demo 06) antes de la reestructura del
> 9 ago 2026.

## Objetivo

> ¿Puede el mismo motor AR producir experiencias de negocio
> significativamente distintas sin modificar el código del motor?

Esta es una de las preguntas arquitectónicas más importantes de toda la
exploración — valida si "configuration-driven engine" es viable.

## Estructura de ejemplo

```text
public/businesses/

polleria/
  config.json
  target.mind
  chicken.glb
  logo.png

chifa/
  config.json
  target.mind
  dragon.glb
  logo.png

cafe/
  config.json
  target.mind
  coffee.glb
  logo.png
```

## Configuración de ejemplo

```json
{
  "businessId": "polleria-marco",
  "branding": { "name": "Pollería Marco", "primaryColor": "#E31B23" },
  "ar": { "target": "./target.mind", "model": "./chicken.glb", "scale": 0.7 },
  "character": { "idleAnimation": "Idle", "hitAnimation": "Jump" },
  "game": { "type": "catch", "duration": 20 },
  "reward": { "title": "Papas Gratis" }
}
```

## Ruteo

```text
/?experience=polleria
/?experience=chifa
/?experience=cafe
```

La implementación exacta del ruteo puede variar.

## Criterios de aceptación

Cambiar de configuración debe poder cambiar: branding, target, modelo 3D,
escala, animaciones, configuración del juego, recompensa demo — sin que el
motor central duplique implementaciones por negocio.
