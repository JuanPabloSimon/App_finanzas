# Tasks — h13_refactor_ux_gestix

> Pasos discretos en orden para implementar `H13 — h13_refactor_ux_gestix`.
> El implementer marca `[x]` al completar cada uno. Cada tarea indica los requisitos que cubre.

## Dominio y Persistencia

- [x] T1 — Extender `UserAccount` en `src/domain/models/userAccount.js` con `copyWith({ fullName, username })` e implementar `updateProfile({ id, fullName, username })` en `SqliteUserAccountRepository` (`src/data/repositories/sqliteMonthlyIncomeRepository.js`) y en el repositorio en memoria de `src/app/AppShell.jsx`. Cubre: R6, R7.

## Presentación — Header Ge$tix y Menú de Perfil

- [x] T2 — Refactorizar `src/app/AppShell.jsx` (y `AppConsentController`) para que en modo mobile (`< 768px`) el contenedor y `app-header` no tengan márgenes exteriores (`margin: 0`, `borderRadius: 0`) y muestren únicamente el título `"Ge$tix"` y el botón con ícono de perfil (`data-testid="profile-menu-button"`), desplegando al tocarlo el panel `data-testid="profile-menu-popover"` con edición de perfil (`updateProfile`), acceso discreto a Privacidad (`data-testid="open-settings-privacy-button"`) y cierre de sesión (`data-testid="logout-button"`). Cubre: R5, R6, R7.

## Presentación — Dashboard sin scroll, Tarjetas Inferiores y Contraste de Monto

- [x] T3 — Actualizar `src/features/income/CategoryDistributionChart.jsx` para soportar el modo `compact` en la pestaña Resumen, permitiendo visualizar el gráfico anular y las categorías dentro del viewport sin scroll vertical y conservando todos los `data-testid` de `H6`. Cubre: R1, R2.
- [x] T4 — Refactorizar `src/features/income/MonthlyOverviewScreen.jsx` (y `MonthlyOverviewController`) para: (a) hacer que la pestaña `'overview'` sea exclusivamente informativa y entre en el viewport sin scroll vertical (`overflowY: 'hidden'`), (b) separar los formularios y listados en las 5 pestañas dedicadas (`overview`, `expenses`, `income`, `investments`, `reminders`), (c) ubicar `overview-tabs` en el borde inferior con pequeñas tarjetas que cambian de color y se elevan (`transform: 'translateY(-8px)'`) al seleccionarse, y (d) aplicar alto contraste explícito en los inputs de monto. Cubre: R1, R2, R3, R4, R8.
- [x] T5 — Actualizar `src/features/expenses/ExpenseFormScreen.jsx` para garantizar alto contraste explícito en `styles.amountInput` (`backgroundColor: '#FFFFFF'`, `color: '#0B192C'`, `caretColor: '#0B192C'`, `colorScheme: 'light'`, `border: '2px solid #0F2942'`). Cubre: R8.

## Pruebas y Verificación

- [x] T6 — Agregar pruebas automatizadas `[H13-R1]` a `[H13-R8]` en `test/features/income/MonthlyOverviewScreen.test.jsx` verificando el Resumen informativo sin scroll, la separación en 5 pestañas, las tarjetas inferiores con cambio de color y elevación, el header mobile `"Ge$tix"` sin márgenes con menú de perfil (edición de perfil, privacidad discreta y logout) y el alto contraste en los campos de monto, asegurando que todas las pruebas previas (`H1..H6`, `H12`) sigan en verde. Cubre: R1, R2, R3, R4, R5, R6, R7, R8.
- [x] T7 — Documentar la implementación en `progress/impl_h13_refactor_ux_gestix.md`, actualizar `progress/traceability.md` y ejecutar `powershell -ExecutionPolicy Bypass -File ./init.ps1` verificando 0 errores de linter, arnés SDD consistente y 100 % de pruebas en verde. Cubre: R1..R8.
