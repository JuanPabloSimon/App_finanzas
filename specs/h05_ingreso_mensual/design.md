# Design — h05_ingreso_mensual

> Decisiones técnicas para H5 (`h05_ingreso_mensual`, orden 5 del flujo SDD) y el Panel de Resumen General del Mes con Cuenta Local, Registro de Inversiones, Recordatorios y Paleta Corporativa.

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| core | `src/core/theme.js` | Nuevo: paleta corporativa sobria (`CORPORATE_THEME` con Azul Marino `#0F2942`, Azul Acero `#1B365D`, Marrón Oscuro `#4A3525`, Bronce `#6B4C35`, Fondo cálido `#F4F1EA`) |
| core | `src/core/errors.js` | Extender con `InvalidInvestment`, `InvalidReminder` e `InvalidCredentials` |
| domain | `src/domain/models/monthlyIncome.js` | Nuevo: modelo inmutable `MonthlyIncome` (`yearMonth`, `amountCents`, `updatedAt`) y helper puro `calculateCategoryIncomeBreakdown(expenses, categories, monthlyIncome)` |
| domain | `src/domain/models/investment.js` | Nuevo: modelo inmutable `Investment` (`id`, `assetName`, `platform`, `amountCents`, `date`, `dueDate`, `note`, `createdAt`) |
| domain | `src/domain/models/reminder.js` | Nuevo: modelo inmutable `Reminder` (`id`, `title`, `dueDate`, `amountCents`, `isCompleted`, `createdAt`) |
| domain | `src/domain/models/userAccount.js` | Nuevo: modelo inmutable `UserAccount` (`id`, `fullName`, `username`, `createdAt`) |
| domain | `src/domain/repositories/monthlyIncomeRepository.js` | Nuevo: contrato `MonthlyIncomeRepository` (`save`, `findByYearMonth`) |
| data | `src/data/db/appDatabase.js` | Agregar migración versión 2 (`user_accounts`, `investments`, `reminders`) mantendo intacta la migración versión 1 |
| data | `src/data/repositories/sqliteMonthlyIncomeRepository.js` | Nuevo: `SqliteMonthlyIncomeRepository`, `SqliteInvestmentRepository`, `SqliteReminderRepository` y `SqliteUserAccountRepository` sobre SQLite |
| presentation | `src/features/income/MonthlyOverviewScreen.jsx` | Nuevo: Panel de Resumen General del Mes con pestañas (`Resumen`, `Gastos`, `Ingresos`, `Inversiones`, `Recordatorios`, `Consejos`), porcentajes de gasto sobre ingreso, registro de inversiones (Plazo Fijo, FCI, CEDEAR), recordatorios de vencimiento y consejos orientativos |
| presentation | `src/app/AppShell.jsx` | Integrar paleta corporativa, Login/Registro de cuenta local (`requireAuth` / `AuthScreen`), persistencia en `localStorage` para demostración en navegador y navegación entre el Resumen General y los módulos |
| test | `test/domain/models/monthlyIncome.test.js` | Nuevo: pruebas unitarias `[H5-R1]`, `[H5-R2]`, `[H5-R3]`, `[H5-R4]` y `[H5-R5]` |
| test | `test/data/sqliteMonthlyIncomeRepository.test.js` | Nuevo: pruebas de persistencia SQLite en memoria `[H5-R1]`, `[H5-R4]`, `[H5-R5]`, `[H5-R6]`, `[H5-R7]` |
| test | `test/features/income/MonthlyOverviewScreen.test.jsx` | Nuevo: pruebas de componente e interacción `[H5-R1]..[H5-R8]` |

## Paleta Corporativa (`src/core/theme.js`)

- **Azul Marino Principal (`navyPrimary`):** `#0F2942`
- **Azul Institucional (`navySecondary`):** `#1B365D`
- **Marrón Oscuro Corporativo (`brownPrimary`):** `#4A3525`
- **Marrón Bronce / Tierra (`brownAccent`):** `#6B4C35`
- **Superficie / Fondo (`background`):** `#F4F1EA`
- **Tarjetas (`surface`):** `#FFFFFF` con borde `#D8D2C5`

## Diseño Mobile First y adaptación Desktop

- **Mobile (`< 768px`):**
  - Navegación compacta por secciones, tarjetas de resumen apiladas en 1 columna (`data-columns="1"`) y botones táctiles de al menos `48px` de altura.
- **Desktop (`≥ 768px`):**
  - Encabezado institucional con datos del titular de la cuenta, barra de secciones horizontal, KPIs en grilla ejecutiva multicolumna y paneles en paralelo (`data-columns="2"`).

## Privacidad y Datos Locales

- Todo el registro de cuenta, ingresos, gastos, inversiones y recordatorios reside en SQLite local (`gastos.db`) en el dispositivo (y en `localStorage` cuando se ejecuta la vista previa Web con Vite), sin enviar datos personales a servidores externos.
