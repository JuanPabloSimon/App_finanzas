# Tasks — h14_refactor_desktop_y_perfil

> Pasos discretos en orden para implementar `H14 — h14_refactor_desktop_y_perfil`.
> El implementer marca `[x]` al completar cada uno. Cada tarea indica los requisitos que cubre.

## Core y Persistencia

- [x] T1 — Actualizar `CHART_PALETTE` en `src/core/theme.js` con la paleta vibrante de alto contraste (`#2563EB`, `#10B981`, `#F59E0B`, `#F43F5E`, `#8B5CF6`, `#06B6D4`, `#84CC16`, `#EC4899`) y extender `getViewportLayout` en `src/core/responsive.js` con `desktopContainerWidth: '80%'` y `desktopContainerMaxWidth: 1440` en Desktop. Cubre: R3, R5.
- [x] T2 — Implementar `changePassword({ id, currentPassword, newPassword })` en `SqliteUserAccountRepository` (`src/data/repositories/sqliteMonthlyIncomeRepository.js`), en el repositorio en memoria de `src/app/AppShell.jsx` y en el adaptador de `localStorage` de `src/App.jsx`. Cubre: R8, R9.

## Presentación — Página dedicada de Perfil y Navbar Desktop

- [x] T3 — Crear `src/features/profile/UserProfileScreen.jsx` (`data-testid="user-profile-screen"`) con diseño Mobile First + Desktop, mostrando los datos de la cuenta local, el formulario `profile-edit-form`, el formulario `profile-password-form` (`profile-current-password-input`, `profile-new-password-input`, `profile-password-submit-button`, `profile-password-error`, `profile-password-success`) y el botón `close-profile-page-button`. Cubre: R7, R8, R9.
- [x] T4 — Refactorizar `src/app/AppShell.jsx` (y `AppConsentController`) para: (a) hacer que `app-header` ocupe el 100 % del ancho en todas las resoluciones, (b) reemplazar en `profile-menu-popover` el formulario inline por el botón `open-profile-page-button` que navega a `view === 'profile'` (`UserProfileScreen`), y (c) exponer `openProfilePage()`, `closeProfilePage()` y `changePassword({ currentPassword, newPassword })`. Cubre: R1, R6, R7, R8, R9.

## Presentación — Layout Desktop al 80 %, Navegación Superior y Resumen con Paneles Ejecutivos

- [x] T5 — Actualizar `src/features/income/CategoryDistributionChart.jsx` para ampliar el gráfico anular SVG en modo Desktop (`>= 200px` en vista protagónica de Resumen Desktop) usando los nuevos colores vibrantes de `CHART_PALETTE`. Cubre: R3, R5.
- [x] T6 — Refactorizar `src/features/income/MonthlyOverviewScreen.jsx` para que en modo Desktop (`viewportWidth >= 1024`): (a) la barra `overview-tabs` se integre en la franja superior de navegación (`position: 'static'`, sin dock fijo inferior) mientras en Mobile/Tablet (`< 1024`) se conserve fija abajo con `translateY(-8px)`, (b) el contenedor principal use `width: '80%'` y `maxWidth: 1440`, y (c) la pestaña `overview` mantenga `overflowY: 'hidden'` y organice el contenido en `desktop-overview-grid` con el gráfico ampliado a la izquierda y `desktop-overview-insights` (`desktop-insight-pulse`, `desktop-insight-recent`, `desktop-insight-alerts`) a la derecha. Cubre: R1, R2, R3, R4.

## Pruebas y Verificación

- [x] T7 — Agregar las pruebas etiquetadas `[H14-R1]`..`[H14-R9]` en `test/domain/models/monthlyIncome.test.js`, `test/data/sqliteMonthlyIncomeRepository.test.js` y `test/features/income/MonthlyOverviewScreen.test.jsx`, y actualizar los 2 literales justificados en `design.md` (`[H6-R1]` y `[H13-R6]`). Cubre: R1..R9.
- [x] T8 — Actualizar `progress/traceability.md`, redactar `progress/impl_h14_refactor_desktop_y_perfil.md` y verificar `powershell -ExecutionPolicy Bypass -File ./init.ps1` en verde. Cubre: R1..R9.
