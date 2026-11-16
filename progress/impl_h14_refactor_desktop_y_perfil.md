# Implementación — H14 (`h14_refactor_desktop_y_perfil`)

- **Feature:** `H14 — h14_refactor_desktop_y_perfil` (`orden: 14`)
- **Agente:** `implementer` (`antigravity`)
- **Fecha:** `2026-11-16`

## Tareas completadas (`T1..T8`)

1. **T1 (`src/core/theme.js`, `src/core/responsive.js`):**
   - `CHART_PALETTE` actualizada a paleta vibrante de alto contraste (`#2563EB`, `#10B981`, `#F59E0B`, `#F43F5E`, `#8B5CF6`, `#06B6D4`, `#84CC16`, `#EC4899`), independiente de `CORPORATE_THEME`.
   - `getViewportLayout` extendido con `desktopContainerWidth: '80%'` y `desktopContainerMaxWidth: 1440` en Desktop (`>= 1024px`).
2. **T2 (`src/data/repositories/sqliteMonthlyIncomeRepository.js`, `src/app/AppShell.jsx`, `src/App.jsx`):**
   - Implementado `changePassword({ id, currentPassword, newPassword })` validando clave actual e imponiendo largo mínimo de 4 caracteres para la nueva clave.
3. **T3 (`src/features/profile/UserProfileScreen.jsx`):**
   - Creada pantalla dedicada de perfil (`user-profile-screen`) con edición de datos personales (`profile-edit-form`), cambio de contraseña (`profile-password-form`), acceso a privacidad, cierre de sesión y botón para volver al panel (`close-profile-page-button`).
4. **T4 (`src/app/AppShell.jsx`):**
   - Header de ancho completo (`100 %`) en todas las resoluciones e integración de `overview-tabs` dentro del navbar superior en Desktop.
   - Menú desplegable de usuario (`profile-menu-popover`) simplificado con `open-profile-page-button` hacia la vista dedicada `view === 'profile'`.
5. **T5 (`src/features/income/CategoryDistributionChart.jsx`):**
   - Dona SVG ampliada en Desktop (`212x212`) con los colores vibrantes de `CHART_PALETTE`.
6. **T6 (`src/features/income/MonthlyOverviewScreen.jsx`):**
   - En Desktop: contenedor al `80 %` (`maxWidth: 1440`), navegación integrada en barra superior sin dock fijo inferior, y pestaña Resumen sin scroll (`overflowY: 'hidden'`) organizada en `desktop-overview-grid` con gráfico protagónico a la izquierda y `desktop-overview-insights` (`desktop-insight-pulse`, `desktop-insight-recent`, `desktop-insight-alerts`) a la derecha.
7. **T7–T8 (`test/`, `progress/traceability.md`):**
   - 5 pruebas nuevas etiquetadas (`[H14-R1]`..`[H14-R9]`) y actualización de los 2 literales justificados en `design.md`.
