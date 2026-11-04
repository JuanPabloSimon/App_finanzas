# Tasks — h12_aviso_privacidad

> Pasos discretos en orden. El implementer marca `[x]` al completar cada uno.
> Cada tarea indica los requisitos que cubre.

## Infraestructura base y Dominio

- [x] T1 — Crear `src/core/errors.js` (`DomainException`, `InvalidConsent`), `src/core/dates.js` (`formatIsoDateTime`, `isValidIsoDateTime`) y `src/core/responsive.js` (`BREAKPOINTS`, `getViewportLayout`). Cubre: R4, R8.
- [x] T2 — Crear el modelo inmutable `Consent`, la constante `CURRENT_POLICY_VERSION` y los textos normativos `PRIVACY_NOTICE_CONTENT` en `src/domain/models/consent.js`, junto con el contrato `ConsentRepository` en `src/domain/repositories/consentRepository.js`. Cubre: R3, R4.
- [x] T3 — Crear pruebas unitarias `[H12-R3]` y `[H12-R4]` en `test/domain/models/consent.test.js` verificando la inmutabilidad de `Consent`, la validación de fecha ISO 8601 y la presencia de finalidad, almacenamiento local y transferencia al modelo en `PRIVACY_NOTICE_CONTENT`. Cubre: R3, R4.

## Persistencia (`expo-sqlite` / SQLite en memoria)

- [x] T4 — Crear `src/data/db/appDatabase.js` con la migración versión 1 (`categories`, `expenses`, `monthly_incomes`, `consents` y categorías predefinidas) y soporte `AppDatabase.openInMemory()`. Cubre: R4, R6.
- [x] T5 — Crear `SqliteConsentRepository` en `src/data/repositories/sqliteConsentRepository.js` implementando `findByVersion`, `hasAcceptedVersion` y `save`. Cubre: R4, R6.
- [x] T6 — Crear pruebas de persistencia `[H12-R4]` y `[H12-R6]` con base SQLite en memoria en `test/data/sqliteConsentRepository.test.js`. Cubre: R4, R6.

## Presentación (Mobile First + Desktop)

- [x] T7 — Crear `PrivacyNoticeScreen` en `src/features/privacy/PrivacyNoticeScreen.jsx` con diseño Mobile First (`< 768px`) y adaptación Desktop (`≥ 768px`), modo de aceptación inicial y modo de consulta desde ajustes (`readOnly`) mostrando versión y fecha de aceptación. Cubre: R1, R3, R5, R7, R8.
- [x] T8 — Crear `AppShell` en `src/app/AppShell.jsx` y conectarlo en `src/App.jsx` para bloquear el acceso a la pantalla principal mientras no esté aceptada `CURRENT_POLICY_VERSION` y permitir consultar el aviso desde Ajustes una vez aceptado. Cubre: R1, R2, R5, R6, R7.
- [x] T9 — Crear pruebas de interfaz y flujo `[H12-R1]`, `[H12-R2]`, `[H12-R3]`, `[H12-R5]`, `[H12-R6]`, `[H12-R7]` y `[H12-R8]` en `test/features/privacy/PrivacyNoticeScreen.test.jsx`. Cubre: R1, R2, R3, R5, R6, R7, R8.

## Cierre

- [x] T10 — Documentar la trazabilidad en `progress/impl_h12_aviso_privacidad.md` y actualizar `progress/traceability.md`.
- [x] T11 — Ejecutar `./init.sh` (o `powershell -ExecutionPolicy Bypass -File ./init.ps1`) y verificar que análisis estático, arnés SDD y pruebas están en verde.
