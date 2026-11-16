# Review — H14 `h14_refactor_desktop_y_perfil`

**Veredicto:** APPROVED

## Trazabilidad requisitos ↔ pruebas
- R1: [x] `test/features/income/MonthlyOverviewScreen.test.jsx:1490` `[H14-R1][H14-R2] en Desktop el navbar ocupa el 100 % del ancho e integra las 5 pestañas en la barra superior sin dock fijo inferior, conservando las tarjetas inferiores fijas en Mobile`
- R2: [x] `test/features/income/MonthlyOverviewScreen.test.jsx:1490` `[H14-R1][H14-R2] en Desktop el navbar ocupa el 100 % del ancho e integra las 5 pestañas en la barra superior sin dock fijo inferior, conservando las tarjetas inferiores fijas en Mobile`
- R3: [x] `test/features/income/MonthlyOverviewScreen.test.jsx:1559` `[H14-R3][H14-R4][H14-R5] en Desktop el contenedor principal ocupa el 80 % del ancho sin scroll vertical en Resumen, amplía el gráfico con colores vibrantes y muestra los tres paneles informativos complementarios`
- R4: [x] `test/features/income/MonthlyOverviewScreen.test.jsx:1559` `[H14-R3][H14-R4][H14-R5] en Desktop el contenedor principal ocupa el 80 % del ancho sin scroll vertical en Resumen, amplía el gráfico con colores vibrantes y muestra los tres paneles informativos complementarios`
- R5: [x] `test/domain/models/monthlyIncome.test.js:234` `[H14-R5] asigna a las categorías del gráfico una paleta cromática vibrante e independiente de la paleta corporativa sobria` y `test/features/income/MonthlyOverviewScreen.test.jsx:1559` `[H14-R3][H14-R4][H14-R5]`
- R6: [x] `test/features/income/MonthlyOverviewScreen.test.jsx:1614` `[H14-R6][H14-R7][H14-R8][H14-R9] el menú de usuario abre la página dedicada de perfil donde edita sus datos y cambia su contraseña validando la clave actual y el largo mínimo`
- R7: [x] `test/features/income/MonthlyOverviewScreen.test.jsx:1614` `[H14-R6][H14-R7][H14-R8][H14-R9] el menú de usuario abre la página dedicada de perfil donde edita sus datos y cambia su contraseña validando la clave actual y el largo mínimo`
- R8: [x] `test/data/sqliteMonthlyIncomeRepository.test.js:149` `[H14-R8][H14-R9] cambia la contraseña local en SQLite cuando la clave actual es válida y la nueva tiene >= 4 caracteres, rechazando claves inválidas sin modificar user_accounts` y `test/features/income/MonthlyOverviewScreen.test.jsx:1614` `[H14-R6][H14-R7][H14-R8][H14-R9]`
- R9: [x] `test/data/sqliteMonthlyIncomeRepository.test.js:149` `[H14-R8][H14-R9]` y `test/features/income/MonthlyOverviewScreen.test.jsx:1614` `[H14-R6][H14-R7][H14-R8][H14-R9]`

## Tareas (`specs/h14_refactor_desktop_y_perfil/tasks.md`)
- T1: [x] `CHART_PALETTE` vibrante en `src/core/theme.js` y `desktopContainerWidth: '80%'` / `desktopContainerMaxWidth: 1440` en `src/core/responsive.js`.
- T2: [x] `changePassword({ id, currentPassword, newPassword })` en `SqliteUserAccountRepository` (`src/data/repositories/sqliteMonthlyIncomeRepository.js`), repositorio en memoria (`src/app/AppShell.jsx`) y adaptador `localStorage` (`src/App.jsx`).
- T3: [x] Pantalla dedicada `src/features/profile/UserProfileScreen.jsx` (`user-profile-screen`, `profile-edit-form`, `profile-password-form`, `close-profile-page-button`).
- T4: [x] Refactor de `src/app/AppShell.jsx` con `app-header` al 100 % del ancho, navegación Desktop integrada (`data-nav-placement="header"`), `profile-menu-popover` simplificado con `open-profile-page-button` y vista `view === 'profile'`.
- T5: [x] Dona SVG ampliada a `212x212` en Desktop en `src/features/income/CategoryDistributionChart.jsx` con `CHART_PALETTE`.
- T6: [x] Layout Desktop al 80 % (`maxWidth: 1440`), pestaña Resumen sin scroll (`overflowY: 'hidden'`) con `desktop-overview-grid` y `desktop-overview-insights` (`desktop-insight-pulse`, `desktop-insight-recent`, `desktop-insight-alerts`) en `src/features/income/MonthlyOverviewScreen.jsx`.
- T7: [x] Pruebas `[H14-R1]`..`[H14-R9]` agregadas y los 2 literales justificados en `design.md` (`[H6-R1]` y `[H13-R6]`) actualizados.
- T8: [x] `progress/traceability.md` y `progress/impl_h14_refactor_desktop_y_perfil.md` actualizados y `./init.ps1` en verde.

## Arquitectura, Mobile First + Desktop y privacidad
- [x] `src/domain/` es JavaScript puro: no importa `react`, `react-dom`, `node:sqlite` ni clientes HTTP (`fetch`, `axios`).
- [x] Solo `src/assistant/` realiza llamadas de red; el cambio de contraseña y la edición de perfil operan exclusivamente sobre almacenamiento local (`SQLite` y `localStorage`).
- [x] Sin dependencias nuevas en `package.json`.
- [x] Importes en centavos enteros (`Number.isInteger`).
- [x] Diseño Mobile First (`< 1024px` con dock fijo inferior y tarjetas elevadas `translateY(-8px)`) y adaptación responsiva Desktop (`>= 1024px` con navbar 100 %, contenedor 80 % hasta `1440px`, Resumen de 2 columnas sin scroll y `UserProfileScreen` en grilla de 2 tarjetas).
- [x] Privacidad (Ley 25.326): `openProfilePage()` y `closeProfilePage()` respetan la compuerta de consentimiento (`H12`), y el aviso de privacidad puede consultarse tanto desde `profile-menu-popover` como desde `UserProfileScreen`.
- [x] Sin `console.log()` de depuración, sin código comentado ni TODOs sin contexto.
- [x] `powershell -ExecutionPolicy Bypass -File ./init.ps1` en verde: 0 advertencias de arnés, 176/176 requisitos con prueba etiquetada (100 %), `eslint` sin errores y 283/283 pruebas en verde (46 suites).

## Checkpoints
- C1: [x] Arnés completo y `./init.ps1` termina con código 0.
- C2: [x] Estado coherente (1 sola feature en `in_progress`, `progress/current.md` actualizado).
- C3: [x] Arquitectura en capas respetada, enfoque Mobile First + Desktop, sin `console.log()` ni TODO sin contexto.
- C4: [x] Verificación real (`npm run lint` limpio, 283 pruebas en verde con `AppDatabase.openInMemory()` y `FakeLlmClient`).
- C5: [x] Sin archivos temporales ni secretos expuestos.
- C6: [x] SDD completo (`requirements.md`, `design.md`, `tasks.md` con `T1..T8` en `[x]`, `R1..R9` con pruebas etiquetadas y `progress/traceability.md` actualizado).
- C7: [x] Privacidad Ley 25.326 preservada.

## Cambios requeridos
Ninguno.
