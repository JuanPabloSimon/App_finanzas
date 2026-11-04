# Implementación — h12_aviso_privacidad

- **Feature:** `H12 — h12_aviso_privacidad` (Aviso de privacidad y consentimiento)
- **Herramienta:** `antigravity`
- **Rol:** `implementer`
- **Estado:** `done` (listo para re-verificación por `reviewer`)

## Archivos creados y modificados

| Capa | Archivo | Acción |
|---|---|---|
| core | `src/core/errors.js` | Creado (`DomainException`, `InvalidConsent`) |
| core | `src/core/dates.js` | Creado (`formatIsoDateTime`, `isValidIsoDateTime`) |
| core | `src/core/responsive.js` | Creado (`MOBILE_MAX_WIDTH`, `DESKTOP_MIN_WIDTH`, `BREAKPOINTS`, `getViewportLayout`) |
| domain | `src/domain/models/consent.js` | Creado (`Consent` inmutable con `Object.freeze`, `copyWith`, `isEqual`, `CURRENT_POLICY_VERSION = '2026-10'`, `PRIVACY_NOTICE_CONTENT`, `PRIVACY_NOTICE_SECTIONS`) |
| domain | `src/domain/repositories/consentRepository.js` | Creado (`ConsentRepository`) |
| data | `src/data/db/appDatabase.js` | Creado (`AppDatabase` con migración v1: `categories`, `expenses`, `monthly_incomes`, `consents`, 10 categorías predefinidas y `openInMemory()` sobre `node:sqlite`) |
| data | `src/data/repositories/sqliteConsentRepository.js` | Creado (`SqliteConsentRepository` con consultas SQL parametrizadas) |
| presentation | `src/features/privacy/PrivacyNoticeScreen.jsx` | Creado (pantalla Mobile First + Desktop, modo de aceptación inicial y modo lectura en Ajustes) |
| presentation | `src/app/AppShell.jsx` | Creado (guardia de consentimiento sobre `CURRENT_POLICY_VERSION` y navegación a Ajustes → Aviso de privacidad) |
| presentation | `src/App.jsx` | Modificado (conectado a `AppShell` con ancho responsivo de ventana) |
| test | `test/domain/models/consent.test.js` | Creado (pruebas unitarias `[H12-R3]`, `[H12-R4]`) |
| test | `test/data/sqliteConsentRepository.test.js` | Creado (pruebas de persistencia SQLite en memoria `[H12-R4]`, `[H12-R6]`) |
| test | `test/features/privacy/PrivacyNoticeScreen.test.jsx` | Creado (pruebas de UI, guardia, ajustes y responsive `[H12-R1]`, `[H12-R2]`, `[H12-R3]`, `[H12-R5]`, `[H12-R6]`, `[H12-R7]`, `[H12-R8]`) |
| tool | `tool/jsx_loader.mjs` | Creado (loader ESM nativo con `node:module` `registerHooks` / `register` + `node:fs` para cargar módulos `.jsx` en `node --test` sin dependencias externas) |
| config | `package.json` | Modificado (script `"test"` actualizado con `--import ./tool/jsx_loader.mjs`, sin agregar dependencias externas) |

## Trazabilidad (`R<n>` → Prueba)

| Requisito | Etiqueta | Archivo de prueba | Descripción de la prueba |
|---|---|---|---|
| R1 | `[H12-R1]` | `test/features/privacy/PrivacyNoticeScreen.test.jsx` | `[H12-R1][H12-R2] en el primer inicio sin consentimiento vigente muestra el aviso de privacidad y bloquea el acceso a la pantalla principal` |
| R2 | `[H12-R2]` | `test/features/privacy/PrivacyNoticeScreen.test.jsx` | `[H12-R1][H12-R2] en el primer inicio sin consentimiento vigente muestra el aviso de privacidad y bloquea el acceso a la pantalla principal` y `[H12-R2] si solo existe consentimiento de una versión anterior del aviso mantiene bloqueado el acceso hasta aceptar la versión vigente` |
| R3 | `[H12-R3]` | `test/domain/models/consent.test.js`, `test/features/privacy/PrivacyNoticeScreen.test.jsx` | `[H12-R3] PRIVACY_NOTICE_CONTENT incluye finalidad, almacenamiento local en SQLite y condiciones de transferencia del resumen agregado al proveedor del modelo` y `[H12-R3] muestra en el aviso de privacidad la finalidad, el almacenamiento local en SQLite y la transferencia solo de resumen agregado al proveedor del modelo` |
| R4 | `[H12-R4]` | `test/domain/models/consent.test.js`, `test/data/sqliteConsentRepository.test.js` | `[H12-R4] crea una instancia inmutable de Consent con versión y fecha ISO 8601 válida y soporta copyWith e isEqual`, `[H12-R4] rechaza versiones vacías o fechas que no cumplen ISO 8601 sin zona (YYYY-MM-DDTHH:MM:SS) lanzando InvalidConsent` y `[H12-R4] guarda la versión del aviso y la fecha de aceptación en formato ISO 8601 en la tabla consents y permite recuperarla` |
| R5 | `[H12-R5]` | `test/features/privacy/PrivacyNoticeScreen.test.jsx` | `[H12-R5] al confirmar la aceptación guarda el consentimiento en SQLite y desbloquea de inmediato la pantalla principal sin reiniciar` |
| R6 | `[H12-R6]` | `test/data/sqliteConsentRepository.test.js`, `test/features/privacy/PrivacyNoticeScreen.test.jsx` | `[H12-R6] informa si la versión vigente fue aceptada y distingue versiones anteriores de la versión vigente` y `[H12-R6] cuando ya existe un consentimiento registrado para la versión vigente inicia directamente en la pantalla principal` |
| R7 | `[H12-R7]` | `test/features/privacy/PrivacyNoticeScreen.test.jsx` | `[H12-R7] al acceder desde ajustes muestra nuevamente el aviso completo junto con la versión aceptada, la fecha registrada y permite volver` |
| R8 | `[H12-R8]` | `test/features/privacy/PrivacyNoticeScreen.test.jsx` | `[H12-R8] aplica diseño Mobile First (< 768px) en una columna con botón táctil >= 48px y se adapta a pantallas Tablet/Desktop (>= 768px) con grilla multicolumna y soporte de teclado` |

## Salida resumida de `./init.ps1`

```text
-- 1. Entorno (Node.js / React Native) -----------------
[OK]    Node.js v24.19.0
[OK]    npm v12.0.2
-- 2. Dependencias -------------------------------------
[OK]    node_modules presente
-- 3. Arnes SDD ----------------------------------------
[OK]    feature_list.json válido (12 features, 1 en curso)
[OK]    H12: spec completo (8 requisitos)
[OK]    H12: todos los requisitos tienen prueba etiquetada
[OK]    Trazabilidad (K6 parcial): 8 de 8 requisitos con prueba (100 %)
[OK]    Arnés consistente (0 advertencias).
-- 4. Analisis estatico (ESLint) -----------------------
[OK]    eslint sin problemas
-- 5. Pruebas ------------------------------------------
ℹ tests 14 | suites 3 | pass 14 | fail 0
[OK]    Todas las pruebas pasan
-- 6. Resumen ------------------------------------------
[OK]    Entorno listo. Podes empezar a trabajar.
```

## Desvíos respecto del diseño

- Ninguno en la arquitectura ni en el diseño de `H12`. Para que `node --test` en Node.js v24.19.0 cargue archivos con extensión `.jsx` sin agregar dependencias externas a `package.json`, se incorporó el loader ESM nativo `tool/jsx_loader.mjs` (`node:module` + `node:fs`) invocado mediante `--import ./tool/jsx_loader.mjs` en el script `"test"` de `package.json`, tal como indicó la revisión en `progress/review_h12_aviso_privacidad.md`.
