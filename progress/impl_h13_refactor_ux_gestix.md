# Implementación — h13_refactor_ux_gestix (H13)

- **Feature:** `H13 — h13_refactor_ux_gestix` ("Refactor UX Ge$tix: dashboard sin scroll, navegación inferior en tarjetas, header limpio con perfil y contraste de monto")
- **Herramienta:** `antigravity`
- **Rol:** `implementer`
- **Fecha:** `2026-11-11`

## Archivos modificados

| Capa | Archivo | Descripción del cambio |
|---|---|---|
| domain | `src/domain/models/userAccount.js` | Incorporación del método inmutable `copyWith({ fullName, username })` en `UserAccount` para soportar la actualización validada del perfil |
| data | `src/data/repositories/sqliteMonthlyIncomeRepository.js` | Implementación de `updateProfile({ id, fullName, username })` en `SqliteUserAccountRepository` validando unicidad de `username` y actualizando `user_accounts` en SQLite |
| presentation (app) | `src/app/AppShell.jsx` | Rediseño del contenedor y header mobile sin márgenes exteriores (`margin: 0`, `padding: 0`, `borderRadius: 0`), mostrando únicamente la marca `"Ge$tix"` (`app-brand-title`) y el botón con ícono de perfil (`profile-menu-button`); despliegue del panel `profile-menu-popover` con edición de cuenta (`profile-edit-form`, `updateProfile`), acceso discreto al aviso de privacidad (`open-settings-privacy-button`) y botón de cierre de sesión (`logout-button`) |
| presentation (features) | `src/features/income/CategoryDistributionChart.jsx` | Soporte de modo `compact` para presentar el gráfico anular y todas las categorías a ancho completo sin recortar filas (`Suscripciones`, etc.), conservando todos los `data-testid` de `H6` |
| presentation (features) | `src/features/income/MonthlyOverviewScreen.jsx` | Pestaña `overview` 100 % informativa y contenida en el viewport sin scroll vertical (`overflowY: 'hidden'`, sin formularios embebidos), ubicando el gráfico de distribución por categoría por encima del cartel de asignación de ingresos (`capital-allocation-strip`); separación de acciones y listados en las 5 pestañas (`overview`, `expenses`, `income`, `investments`, `reminders`); barra de navegación inferior (`overview-tabs`, `bottom: 0`) en pequeñas tarjetas donde la activa cambia de color (`#4A3525`) y se eleva (`transform: 'translateY(-8px)'`); alto contraste explícito en inputs de monto |
| presentation (features) | `src/features/expenses/ExpenseFormScreen.jsx` | Alto contraste explícito en `styles.amountInput` (`backgroundColor: '#FFFFFF'`, `color: '#0B192C'`, `caretColor: '#0B192C'`, `colorScheme: 'light'`, `border: '2px solid #0F2942'`) |
| test | `test/features/income/MonthlyOverviewScreen.test.jsx` | Nuevas pruebas automatizadas etiquetadas `[H13-R1]` a `[H13-R8]` |

## Trazabilidad Requisitos EARS ↔ Pruebas

| Requisito | Archivo de prueba | Descripción de la prueba |
|---|---|---|
| R1 | `test/features/income/MonthlyOverviewScreen.test.jsx` | `[H13-R1][H13-R2] la pestaña principal de Resumen (overview) es exclusivamente informativa, entra en el viewport sin scroll vertical (overflowY: hidden) y no renderiza formularios de carga` |
| R2 | `test/features/income/MonthlyOverviewScreen.test.jsx` | `[H13-R1][H13-R2] la pestaña principal de Resumen (overview) es exclusivamente informativa, entra en el viewport sin scroll vertical (overflowY: hidden) y no renderiza formularios de carga` |
| R3 | `test/features/income/MonthlyOverviewScreen.test.jsx` | `[H13-R3] separa cada acción y su listado relacionado en las 5 pestañas dedicadas (Resumen, Gastos, Ingresos, Inversiones y Alertas)` |
| R4 | `test/features/income/MonthlyOverviewScreen.test.jsx` | `[H13-R4] presenta las secciones en tarjetas en el borde inferior donde la tarjeta seleccionada cambia de color y se destaca desplazándose hacia arriba (translateY(-8px))` |
| R5 | `test/features/income/MonthlyOverviewScreen.test.jsx` | `[H13-R5][H13-R6][H13-R7] en modo mobile el header no tiene márgenes exteriores y muestra solo el título Ge$tix y el ícono de perfil, desplegando al tocarlo la edición de cuenta, el acceso discreto a privacidad y cerrar sesión` |
| R6 | `test/features/income/MonthlyOverviewScreen.test.jsx` | `[H13-R5][H13-R6][H13-R7] en modo mobile el header no tiene márgenes exteriores y muestra solo el título Ge$tix y el ícono de perfil, desplegando al tocarlo la edición de cuenta, el acceso discreto a privacidad y cerrar sesión` |
| R7 | `test/features/income/MonthlyOverviewScreen.test.jsx` | `[H13-R5][H13-R6][H13-R7] en modo mobile el header no tiene márgenes exteriores y muestra solo el título Ge$tix y el ícono de perfil, desplegando al tocarlo la edición de cuenta, el acceso discreto a privacidad y cerrar sesión` |
| R8 | `test/features/income/MonthlyOverviewScreen.test.jsx` | `[H13-R8] aplica alto contraste explícito (fondo #FFFFFF, texto #0B192C, caretColor #0B192C, colorScheme light y borde reforzado) en los campos de monto de gastos, ingresos e inversiones` |

## Salida resumida de `./init.ps1`

```
[OK]    feature_list.json válido (13 features, 1 en curso)
[OK]    H13: spec completo (8 requisitos)
[OK]    H13: todos los requisitos tienen prueba etiquetada
[OK]    Trazabilidad (K6 parcial): 64 de 64 requisitos con prueba (100 %)
[OK]    Arnés consistente (0 advertencias).
[OK]    eslint sin problemas
ℹ tests 81 | suites 9 | pass 81 | fail 0
[OK]    Todas las pruebas pasan
[OK]    Entorno listo. Podes empezar a trabajar.
```

## Desvíos respecto del diseño

- Ninguno. Se respetaron íntegramente las firmas, la estructura de capas y las decisiones de compatibilidad con `H1..H6` y `H12` especificadas en `specs/h13_refactor_ux_gestix/design.md`.
