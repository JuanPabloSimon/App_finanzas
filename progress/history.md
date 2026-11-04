# Bitácora histórica (append-only)

> Cada vez que se cierra una sesión, su resumen se agrega acá.
> No se editan entradas anteriores.

---

## 2026-10-24 — Iteración 1 (previa al arnés)
- **Agente:** equipo, sin arnés SDD.
- **Cambios:** entorno Flutter, base SQLite, registro de gastos, listado mensual, ingreso
  mensual y aviso de privacidad (H1, H2, H3, H5, H12).
- **Verificación:** hito «primer incremento funcional» cumplido el 24/10/2026.
- **Cierre:** historias marcadas `done` con `sdd: false` (legacy).

## 2026-10-28 — Adopción del arnés SDD
- **Agente:** humano (equipo) con asistencia de IA.
- **Cambios:** `AGENTS.md`, `CLAUDE.md`, `rules.md`, `feature_list.json`, `docs/`,
  `.claude/`, `.agents/`, `.antigravity/`, `tool/harness_check.dart`, `init.sh`, `init.ps1`.
- **Spec de ejemplo:** `specs/h09_deteccion_recurrencias/` en `spec_ready`.
- **Pendiente:** calibrar estados de la iteración 2 y aprobar el spec de H9.

## 2026-11-02 — Alineación tecnológica a React Native (Mobile + Desktop, Mobile First) y reinicio SDD
- **Agente:** Antigravity con equipo humano.
- **Cambios:**
  - Actualización integral de `AGENTS.md`, `rules.md`, `CLAUDE.md`, `CHECKPOINTS.md`, `docs/*`, `.agents/*`, `.antigravity/*`, `.claude/*` y `specs/*` al stack **React Native (JavaScript)** con **Expo** (Mobile + React Native Web / Electron / Tauri para Desktop) y **React Native CLI** (`react-native-windows` / `react-native-macos`), diseño **Mobile First** y persistencia local con **`expo-sqlite`**.
  - Migración del verificador del arnés a Node.js (`tool/harness_check.mjs`) y actualización de `init.sh` e `init.ps1`.
  - Actualización de `feature_list.json`: todas las historias `H1`..`H12` pasan a `"status": "pending"` y `"sdd": true` con orden secuencial `1..12`.
- **Verificación:** `node tool/harness_check.mjs` y `./init.ps1` en verde.
- **Pendiente:** iniciar el flujo SDD con `/siguiente-feature` (comenzando por `H12 — h12_aviso_privacidad`, `orden: 1`).

## 2026-11-03 — H12 (`h12_aviso_privacidad`) completada bajo SDD
- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Juan Pablo.
- **Aprobación de spec:** `H12 aprobado por Juan Pablo el 2026-11-03`.
- **Cambios:**
  - Especificación SDD completa en `specs/h12_aviso_privacidad/{requirements,design,tasks}.md` (8 requisitos `R1..R8`, 11 tareas `T1..T11`).
  - Infraestructura base (`src/core/{errors,dates,responsive}.js`), modelo de dominio inmutable `Consent` y contrato `ConsentRepository` (`src/domain/`).
  - Base SQLite local con migración v1 (`src/data/db/appDatabase.js`, `src/data/repositories/sqliteConsentRepository.js`).
  - Pantalla Mobile First + Desktop `PrivacyNoticeScreen` (`src/features/privacy/PrivacyNoticeScreen.jsx`) y guardia de acceso `AppShell` (`src/app/AppShell.jsx`, `src/App.jsx`).
  - Suite de 14 pruebas etiquetadas (`[H12-R1]`..`[H12-R8]`) en `test/domain/models/consent.test.js`, `test/data/sqliteConsentRepository.test.js` y `test/features/privacy/PrivacyNoticeScreen.test.jsx` + loader ESM nativo `tool/jsx_loader.mjs`.
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h12_aviso_privacidad.md`; `./init.ps1`, `eslint` y `npm test` (14/14) en verde.
- **Cierre:** `h12_aviso_privacidad` marcada `done` en `feature_list.json`. Próxima feature en orden: `H1 — h01_registrar_gasto` (`orden: 2`).
