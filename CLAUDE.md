# WebAR Lab

Esta exploración sigue la metodología general en
[laboratorios/PLAYBOOK.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/PLAYBOOK.md)
— este archivo **no la repite**, solo cubre lo específico de WebAR. Ver
también [laboratorios/CATALOGO.md](https://github.com/marcoantonioludenafarje/laboratorios/blob/master/CATALOGO.md)
antes de construir algo que ya podría estar resuelto en otra exploración.

- **Objetivo / preguntas / visión**: [OBJECTIVE.md](./OBJECTIVE.md)
- **Qué labs existen, en qué orden, qué preguntan**: [ROADMAP.md](./ROADMAP.md)
- **Qué se aprendió / decisiones tomadas**: [docs/findings.md](./docs/findings.md), [docs/decisions.md](./docs/decisions.md)
- **Cómo correr y probar el proyecto**: [README.md](./README.md)

## 1. Etapa actual

**Validación tecnológica / proof of concept.** No diseñar esto como SaaS
todavía. No optimizar para escala de producción. Un experimento fallido
que identifica claramente una limitación técnica es un resultado válido.

## 2. Stack

Usar salvo que un experimento requiera explícitamente lo contrario:

- Vite, TypeScript, HTML, CSS
- MindAR, A-Frame (Three.js indirectamente vía A-Frame)
- GLB / glTF para assets 3D

## 3. Explícitamente fuera de alcance

No introducir sin que se pida explícitamente: React/Next/Angular/Vue,
backend, bases de datos, autenticación, AWS/Azure/Firebase, PWA/service
workers, integraciones POS/pago/NFC/loyalty, cuentas de cliente reales,
analytics de producción, microservicios, Kubernetes, SSR.

## 4. Principios específicos de este repo

- **No duplicar implementación entre labs.** Funcionalidad compartida
  (`CameraService`, `MetricsService`, `DebugOverlay`, `EventLog`) vive en
  `src/core/`. Extraer a `core/` solo después de que algo se repite en 2+
  labs — no antes (ver PLAYBOOK.md sobre no sobre-arquitectar).
- **Observabilidad por encima de pulido visual.** Un cubo primitivo con
  buena instrumentación vale más que un personaje bonito sin
  comportamiento medible. Todo lab debe exponer FPS, estado, y un overlay
  de debug — ver `src/core/metrics/`.
- **Los labs ya completados nunca se rompen.** El launcher (`index.html` /
  `src/launcher/`) debe seguir listando todo lab implementado.
- **No fabricar resultados físicos.** Las secciones "Reflexiones"/"Qué
  observamos" de cada `labs/*/README.md` las llena el humano tras probar
  en un dispositivo real — Claude prepara la plantilla y la
  instrumentación, no el resultado.

## 5. Convenciones de código

Preferir: TypeScript estricto donde sea práctico, módulos pequeños,
nombres descriptivos, mínimas dependencias, APIs nativas del navegador,
comentarios explicando decisiones específicas de AR, manejo de errores
explícito.

Evitar: patrones de diseño prematuros, abstracciones de framework
gigantes, DI innecesaria, arquitectura enterprise genérica, trabajo de
escalabilidad especulativo.

## 6. Git

Un experimento coherente por commit. Mensajes tipo:

```text
feat(lab-XX): add <capability>
feat(demo-N): integrate <labs>
fix(lab-XX): <bug>
chore(repo): <reorg/infra>
```

## 7. Cómo trabajar en este repo

1. Inspeccionar qué ya existe (`ROADMAP.md`, `labs/`, `src/core/`).
2. Identificar qué es reutilizable antes de escribir algo nuevo.
3. Plantear el plan de implementación más pequeño posible.
4. No modificar labs no relacionados.
5. Implementar, correr `npm run build`.
6. Reportar qué cambió y qué falta probar físicamente.

No afirmar que una capacidad AR móvil "funciona" sin que se haya validado
físicamente — que el código corra en el navegador no es lo mismo que
validación AR exitosa.
