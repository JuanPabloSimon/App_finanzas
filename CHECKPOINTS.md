# CHECKPOINTS — Evaluación del estado final

> En sistemas multiagente no se evalúa el camino, se evalúa el destino.
> El reviewer recorre cada casilla, marca `[x]` o `[ ]` y rechaza el cierre si queda
> alguna vacía en C1 a C7.

## C1 — El arnés está completo

- [ ] Existen `AGENTS.md`, `CLAUDE.md`, `rules.md`, `feature_list.json`,
      `progress/current.md`, `progress/history.md`, `progress/horas.csv`.
- [ ] Existen `docs/architecture.md`, `docs/conventions.md`, `docs/specs.md`,
      `docs/verification.md` y `docs/Proyecto_Tec_Laborales_Grupo_3.pdf`.
- [ ] `./init.sh` (o `./init.ps1`) termina con código de salida 0.

## C2 — El estado es coherente

- [ ] Como mucho una feature en `in_progress`.
- [ ] Toda feature `done` tiene pruebas que pasan.
- [ ] `progress/current.md` describe la sesión activa o está en plantilla.
- [ ] Si la feature cambió de herramienta, el cambio está registrado en `progress/current.md`.

## C3 — El código respeta la arquitectura y el enfoque Mobile First + Desktop

- [ ] `src/domain/` es JavaScript puro: no importa `react`, `react-native`, `expo-sqlite` ni clientes de red (`fetch`, `axios`).
- [ ] Solo `src/assistant/` realiza llamadas de red.
- [ ] Importes en centavos enteros (`Number.isInteger`); ningún decimal en coma flotante para dinero.
- [ ] Cambios de esquema SQLite (`expo-sqlite`) como migraciones versionadas en `src/data/db/` y documentadas en `docs/data_model.md`.
- [ ] La UI está construida con enfoque **Mobile First** y contempla adaptación responsiva para **Desktop**.
- [ ] Sin `console.log()` de depuración ni TODO sin contexto.

## C4 — La verificación es real

- [ ] `npm run lint` (`eslint`) sin errores ni advertencias.
- [ ] `npm test` con más de 0 pruebas y todas en verde.
- [ ] Persistencia probada con base SQLite en memoria real, no con mocks que omitan SQL.
- [ ] Cliente del modelo reemplazado por `FakeLlmClient` en las pruebas.

## C5 — La sesión se cerró bien

- [ ] Sin archivos temporales ni secretos sin ignorar (`.env`, `key.properties`, `*.jks`).
- [ ] `progress/history.md` tiene la entrada de la última sesión.
- [ ] `progress/horas.csv` tiene las horas de la sesión.

## C6 — Spec Driven Development

- [ ] Toda feature `sdd: true` en `spec_ready`, `in_progress` o `done` tiene sus tres archivos.
- [ ] `requirements.md` usa EARS estricto y cubre todos los criterios de aceptación de la
      feature en `feature_list.json`.
- [ ] Toda feature `done` con `sdd: true` tiene todas sus tareas en `[x]`.
- [ ] Cada `R<n>` tiene al menos una prueba con la etiqueta `[H<id>-R<n>]`.
- [ ] `progress/traceability.md` está actualizado (métrica K6).

## C7 — Privacidad

- [ ] El resumen enviado al modelo respeta `docs/llm_assistant.md` (prueba que lo verifica).
- [ ] Sin consentimiento aceptado no se llama a la API.
- [ ] Las recomendaciones muestran la advertencia de carácter orientativo.
