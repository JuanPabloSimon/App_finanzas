# Review — h12_aviso_privacidad

- **Feature:** `H12 — h12_aviso_privacidad` (Aviso de privacidad y consentimiento)
- **Reviewer:** `reviewer` (`antigravity`)
- **Fecha:** `2026-11-03`
- **Veredicto:** `APPROVED`

---

## 1. Resumen de verificación

Se re-evaluó la implementación de `H12 — h12_aviso_privacidad` tras la resolución del hallazgo de la primera iteración de revisión:
- El `implementer` incorporó `tool/jsx_loader.mjs` (loader ESM nativo con `node:module` `registerHooks` / `register` y `node:fs`) y actualizó `"scripts.test"` en `package.json` (`node --import ./tool/jsx_loader.mjs --test "test/**/*.test.js" "test/**/*.test.jsx"`) sin agregar dependencias externas.
- Las 3 suites (`test/domain/models/consent.test.js`, `test/data/sqliteConsentRepository.test.js` y `test/features/privacy/PrivacyNoticeScreen.test.jsx`), con un total de **14 pruebas**, cubren los 8 requisitos `R1..R8` y pasan en verde junto con `eslint` y `node tool/harness_check.mjs`.

---

## 2. Trazabilidad de requisitos (`R1`..`R8`)

| Requisito | Etiqueta | Archivo de prueba | Verificación del comportamiento |
|---|---|---|---|
| `R1` | `[H12-R1]` | `test/features/privacy/PrivacyNoticeScreen.test.jsx` | **OK:** Verifica que en el primer inicio sin consentimiento registrado para `CURRENT_POLICY_VERSION` (`2026-10`) la vista inicial sea `privacy_gate` y se renderice `privacy-notice-screen` antes que cualquier pantalla principal. |
| `R2` | `[H12-R2]` | `test/features/privacy/PrivacyNoticeScreen.test.jsx` | **OK:** Verifica en dos pruebas que mientras no exista consentimiento vigente (o solo exista uno de una versión anterior como `2025-01`), `canAccessMainApp` sea `false`, los intentos de navegar a `main` o `settings_privacy` permanezcan bloqueados en `privacy_gate` y no se monte el contenido protegido. |
| `R3` | `[H12-R3]` | `test/domain/models/consent.test.js` y `test/features/privacy/PrivacyNoticeScreen.test.jsx` | **OK:** Verifica tanto en el modelo (`PRIVACY_NOTICE_CONTENT` / `PRIVACY_NOTICE_SECTIONS`) como en el HTML renderizado que se informen la finalidad del tratamiento, el almacenamiento 100 % local en SQLite (`gastos.db`) sin servidores propios y la transferencia al proveedor del modelo limitada a un resumen agregado sin notas, subcategorías, fechas exactas ni identificadores. |
| `R4` | `[H12-R4]` | `test/domain/models/consent.test.js` y `test/data/sqliteConsentRepository.test.js` | **OK:** Verifica inmutabilidad de `Consent` (`Object.freeze`), `copyWith`, `isEqual`, validación estricta de `policyVersion` y `acceptedAt` en formato ISO 8601 sin zona (`YYYY-MM-DDTHH:MM:SS`) lanzando `InvalidConsent`, contrato `ConsentRepository` y persistencia real en SQLite en memoria (`consents`) con idempotencia ante doble guardado. |
| `R5` | `[H12-R5]` | `test/features/privacy/PrivacyNoticeScreen.test.jsx` | **OK:** Verifica que al confirmar la aceptación (`acceptPrivacyNotice`) se persista el registro en SQLite y se desbloquee de inmediato la vista `main` (`data-testid="app-main-screen"`) sin requerir reinicio. |
| `R6` | `[H12-R6]` | `test/data/sqliteConsentRepository.test.js` y `test/features/privacy/PrivacyNoticeScreen.test.jsx` | **OK:** Verifica que cuando ya existe un consentimiento registrado en `consents` para `CURRENT_POLICY_VERSION`, `hasAcceptedVersion()` devuelva `true` y `AppShell` inicie directamente en `main` sin volver a mostrar la pantalla de bloqueo. |
| `R7` | `[H12-R7]` | `test/features/privacy/PrivacyNoticeScreen.test.jsx` | **OK:** Verifica que al abrir el aviso desde Ajustes (`openSettingsPrivacy`), `PrivacyNoticeScreen` se renderice en modo lectura (`data-readonly="true"`) mostrando el aviso completo junto con la versión aceptada (`2026-10`), la fecha registrada (`accepted_at`) y el botón «Volver» que regresa a `main`. |
| `R8` | `[H12-R8]` | `test/features/privacy/PrivacyNoticeScreen.test.jsx` | **OK:** Verifica el diseño Mobile First en `390px` (`data-layout="mobile"`, `data-columns="1"`, `padding: 16`, botón de ancho `100%` y `minHeight: 48`) y la adaptación responsiva en Tablet (`800px`, `data-layout="tablet"`, `data-columns="2"`, `maxWidth: 720`) y Desktop (`1280px`, `data-layout="desktop"`, `data-columns="3"`, `maxWidth: 960`, `tabIndex: 0` en tarjetas y botones, y activación por teclado con `Enter` y `Space`). |

---

## 3. Tareas (`specs/h12_aviso_privacidad/tasks.md`)

- Todas las tareas `T1` a `T11` están marcadas como completadas (`[x]`) en `specs/h12_aviso_privacidad/tasks.md` y coinciden con los archivos implementados y verificados.

---

## 4. Arquitectura, Mobile First + Desktop, Privacidad y Convenciones

- **Arquitectura en capas (`presentation → domain ← data`):**
  - `src/domain/models/consent.js` y `src/domain/repositories/consentRepository.js` son JavaScript puro: no importan `react`, `react-native`, `expo-sqlite` ni clientes HTTP (`fetch`, `axios`).
  - Ningún módulo fuera de `src/assistant/` realiza llamadas de red.
  - Esquema v1 en `src/data/db/appDatabase.js` coincidente con `docs/data_model.md` (`categories`, `expenses` con `amount_cents INTEGER NOT NULL CHECK (amount_cents > 0)`, `monthly_incomes`, `consents`, índices y las 10 categorías predefinidas).
- **Mobile First + Desktop:**
  - `src/core/responsive.js`, `src/features/privacy/PrivacyNoticeScreen.jsx` y `src/app/AppShell.jsx` implementan breakpoints `< 768px` (móvil), `768px–1024px` (tablet) y `≥ 1024px` (desktop), objetivos táctiles `minHeight: 48`, contenedores centrados con `maxWidth` y navegación/activación por teclado.
- **Privacidad (Ley 25.326):**
  - Cumple con `docs/privacy.md` y las reglas 15 y 16 de `rules.md`.
- **Convenciones:**
  - Identificadores en inglés, textos de UI y pruebas en español rioplatense, modelos inmutables con `Object.freeze`, errores de dominio heredando de `DomainException`, 0 errores/advertencias de `eslint`, sin `console.log()` en `src/` ni `test/`, sin `TODO` sin contexto.

---

## 5. Evaluación de `CHECKPOINTS.md`

### C1 — El arnés está completo
- [x] Existen `AGENTS.md`, `CLAUDE.md`, `rules.md`, `feature_list.json`, `progress/current.md`, `progress/history.md`, `progress/horas.csv`.
- [x] Existen `docs/architecture.md`, `docs/conventions.md`, `docs/specs.md`, `docs/verification.md`.
- [x] `./init.sh` (o `./init.ps1`) termina con código de salida 0.

### C2 — El estado es coherente
- [x] Como mucho una feature en `in_progress` (`H12 — h12_aviso_privacidad`).
- [x] Toda feature `done` tiene pruebas que pasan.
- [x] `progress/current.md` describe la sesión activa o está en plantilla.
- [x] Si la feature cambió de herramienta, el cambio está registrado en `progress/current.md`.

### C3 — El código respeta la arquitectura y el enfoque Mobile First + Desktop
- [x] `src/domain/` es JavaScript puro: no importa `react`, `react-native`, `expo-sqlite` ni clientes de red (`fetch`, `axios`).
- [x] Solo `src/assistant/` realiza llamadas de red.
- [x] Importes en centavos enteros (`Number.isInteger`); ningún decimal en coma flotante para dinero.
- [x] Cambios de esquema SQLite (`expo-sqlite`) como migraciones versionadas en `src/data/db/` y documentadas en `docs/data_model.md`.
- [x] La UI está construida con enfoque **Mobile First** y contempla adaptación responsiva para **Desktop**.
- [x] Sin `console.log()` de depuración ni TODO sin contexto.

### C4 — La verificación es real
- [x] `npm run lint` (`eslint`) sin errores ni advertencias.
- [x] `npm test` con más de 0 pruebas y todas en verde (3 suites, 14 pruebas en verde).
- [x] Persistencia probada con base SQLite en memoria real (`node:sqlite` `:memory:` en `AppDatabase.openInMemory()`), no con mocks que omitan SQL.
- [x] Cliente del modelo reemplazado por `FakeLlmClient` en las pruebas *(H12 no invoca red)*.

### C5 — La sesión se cerró bien
- [x] Sin archivos temporales ni secretos sin ignorar (`.env`, `key.properties`, `*.jks`).
- [x] `progress/history.md` tiene la entrada de la última sesión.
- [x] `progress/horas.csv` tiene las horas de la sesión *(listo para el cierre de sesión por `leader`)*.

### C6 — Spec Driven Development
- [x] Toda feature `sdd: true` en `spec_ready`, `in_progress` o `done` tiene sus tres archivos.
- [x] `requirements.md` usa EARS estricto y cubre todos los criterios de aceptación de la feature en `feature_list.json`.
- [x] Toda feature `done` con `sdd: true` tiene todas sus tareas en `[x]` (`T1..T11` en `[x]`).
- [x] Cada `R<n>` tiene al menos una prueba con la etiqueta `[H<id>-R<n>]` (`[H12-R1]`..`[H12-R8]`).
- [x] `progress/traceability.md` está actualizado (métrica K6).

### C7 — Privacidad
- [x] El resumen enviado al modelo respeta `docs/llm_assistant.md` *(declarado y verificado en `PRIVACY_NOTICE_CONTENT.thirdPartyTransfer`)*.
- [x] Sin consentimiento aceptado no se llama a la API ni se accede a la aplicación.
- [x] Las recomendaciones muestran la advertencia de carácter orientativo *(declarada en `PRIVACY_NOTICE_CONTENT.purpose`)*.
