# Requirements — h14_refactor_desktop_y_perfil

> Feature #14 (H14) de `feature_list.json`: Refactor UX/UI Desktop: navbar de ancho completo con navegación integrada, Resumen ejecutivo al 80 % sin scroll, paleta vibrante de gráfico y página dedicada de perfil.
> «Como usuario en pantallas de escritorio quiero que el navbar ocupe todo el ancho e integre la navegación principal sin mostrar las tarjetas inferiores móviles, que el contenedor aproveche el 80 % del ancho con un gráfico de categorías más grande y colorido acompañado de paneles informativos sin scroll vertical en Resumen, y que desde el botón de usuario pueda ir a una página dedicada de Perfil para editar mis datos y cambiar mi contraseña.» Prioridad alta, 5 puntos, iteración 3, orden 14.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H14-R<n>]`.

## Definiciones

- **Modo Desktop (`layout.isDesktop`, `viewportWidth >= 1024`):** disposición para pantallas de escritorio donde el navbar superior (`app-header`) ocupa el 100 % del ancho del viewport e integra la navegación de las cinco secciones (`overview`, `expenses`, `income`, `investments`, `reminders`), mientras el contenedor principal ocupa el `80%` del ancho disponible (hasta `1440px`).
- **Grilla ejecutiva de Resumen Desktop (`desktop-overview-grid`):** distribución de dos columnas en la pestaña `overview` cuando `viewportWidth >= 1024` (`minmax(0, 1.45fr) minmax(0, 1fr)`), contenida en el alto de la ventana sin scroll vertical (`overflowY: 'hidden'`), con el gráfico ampliado a la izquierda y paneles informativos complementarios (`desktop-overview-insights`) a la derecha.
- **Paleta cromática vibrante del gráfico (`CHART_PALETTE`):** conjunto de colores de alta saturación y contraste visual (`#2563EB`, `#10B981`, `#F59E0B`, `#F43F5E`, `#8B5CF6`, `#06B6D4`, `#84CC16`, `#EC4899`) aplicado a los segmentos y barras del gráfico de categorías, independiente de la paleta corporativa azul marino/marrón del resto de la interfaz.
- **Página dedicada de Perfil del Usuario (`user-profile-screen`, `view === 'profile'`):** vista dedicada accesible desde el menú del botón de usuario (`open-profile-page-button`) donde el titular consulta los datos de su cuenta local, actualiza su nombre completo y `@usuario` (`profile-edit-form`), cambia su contraseña local (`profile-password-form`) o regresa al tablero (`close-profile-page-button`).

## R1
MIENTRAS la aplicación se ejecute en modo Desktop (`viewportWidth >= 1024`), el sistema DEBE renderizar el navbar superior (`app-header`) ocupando el 100 % del ancho de la página (`width: '100%'`, `borderRadius: 0`) e integrar dentro del mismo navbar la barra de navegación (`overview-tabs`) con los cinco botones de sección (`tab-overview`, `tab-expenses`, `tab-income`, `tab-investments`, `tab-reminders`) conservando sus colores de identidad y estado activo, sin renderizar el dock fijo inferior de tarjetas.

## R2
MIENTRAS la aplicación se ejecute en modo Mobile o Tablet (`viewportWidth < 1024`), el sistema DEBE mantener la navegación en el dock fijo de tarjetas inferiores (`overview-tabs` con `position: 'fixed'` y `bottom: 0`) donde la tarjeta seleccionada cambia de color y se desplaza hacia arriba (`transform: 'translateY(-8px)'`), sin renderizar botones de pestañas dentro del navbar superior.

## R3
MIENTRAS la aplicación se ejecute en modo Desktop (`viewportWidth >= 1024`) y la pestaña activa sea Resumen (`activeTab === 'overview'`), el sistema DEBE dimensionar el contenedor principal al 80 % del ancho disponible (`width: '80%'`, `maxWidth: 1440`), mantener el bloqueo de scroll vertical (`overflowY: 'hidden'`) y distribuir el área principal en dos columnas (`desktop-overview-grid`) donde el gráfico de distribución por categoría ocupa la columna protagónica con un anillo SVG ampliado (`width >= 200`, `height >= 200`).

## R4
MIENTRAS la aplicación se ejecute en modo Desktop (`viewportWidth >= 1024`) y la pestaña activa sea Resumen (`activeTab === 'overview'`), el sistema DEBE mostrar en la columna complementaria (`desktop-overview-insights`) tres paneles ejecutivos exclusivamente informativos (sin formularios de carga): (a) pulso mensual con variación respecto del mes anterior y liquidez disponible (`desktop-insight-pulse`), (b) últimos movimientos registrados del mes (`desktop-insight-recent`) y (c) radar de próximos vencimientos y gastos recurrentes detectados (`desktop-insight-alerts`).

## R5
CUANDO el sistema calcula y renderiza la distribución de gastos por categoría (`calculateCategoryIncomeBreakdown` y `CategoryDistributionChart`), el sistema DEBE asignar a cada categoría colores llamativos y de alto contraste de la paleta vibrante (`CHART_PALETTE`: `#2563EB`, `#10B981`, `#F59E0B`, `#F43F5E`, `#8B5CF6`, `#06B6D4`, `#84CC16`, `#EC4899`), sin alterar la paleta corporativa (`CORPORATE_THEME`) del resto de la aplicación.

## R6
CUANDO el usuario activa el botón de perfil en el navbar (`profile-menu-button`), el sistema DEBE desplegar el menú de cuenta (`profile-menu-popover`) con el identificador de la cuenta activa (`logged-user-badge`) y las acciones para abrir la página dedicada de perfil (`open-profile-page-button`), consultar el aviso de privacidad (`open-settings-privacy-button`) y cerrar la sesión (`logout-button`), sin renderizar formularios de edición dentro del menú desplegable.

## R7
CUANDO el usuario selecciona la opción para ir a su perfil (`open-profile-page-button` o `openProfilePage()`), el sistema DEBE cerrar el menú desplegable y mostrar la página dedicada de Perfil del Usuario (`user-profile-screen`, `view === 'profile'`) con el resumen de cuenta, el formulario de edición de nombre y usuario (`profile-edit-form`), el formulario de cambio de contraseña (`profile-password-form`) y la acción para volver al tablero principal (`close-profile-page-button`).

## R8
CUANDO el usuario envía en la página de perfil el formulario de cambio de contraseña (`profile-password-form`) con su contraseña actual válida y una nueva contraseña de al menos 4 caracteres (`changePassword`), el sistema DEBE actualizar `password_hash` en `user_accounts`, permitir autenticar la cuenta con la nueva contraseña y mostrar un mensaje de confirmación (`profile-password-success`).

## R9
SI el usuario intenta cambiar su contraseña con una contraseña actual incorrecta o con una nueva contraseña de menos de 4 caracteres ENTONCES el sistema NO DEBE modificar el registro en `user_accounts` y DEBE informar el error (`InvalidCredentials` / `profile-password-error`).

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. En versión Desktop, el navbar superior ocupa el 100 % del ancho de la pantalla e integra directamente los botones de navegación de las cinco secciones (Resumen, Gastos, Ingresos, Inversiones y Alertas) manteniendo su identidad visual de selección, sin mostrar la barra fija de tarjetas inferiores (que se conserva en mobile). | R1, R2 |
| CA2. En versión Desktop, el contenedor principal ocupa el 80 % del ancho disponible (con tope estándar de 1440px) y la pestaña Resumen mantiene el bloqueo de scroll vertical (overflowY: hidden), distribuyendo el espacio en una grilla donde el gráfico de categorías se amplía como elemento protagónico junto a paneles informativos de pulso mensual (comparativa con el mes anterior, últimos movimientos registrados y próximos vencimientos/recurrencias). | R3, R4 |
| CA3. El gráfico de distribución de gastos por categoría utiliza una paleta de colores vibrantes y de alto contraste visual, independiente de la paleta corporativa sobria del resto de la aplicación. | R5 |
| CA4. Al tocar el botón de usuario en el navbar, el menú desplegable ya no edita los datos ahí mismo, sino que ofrece la opción de ir a una página dedicada de Perfil del Usuario (además de Privacidad y Cerrar sesión), donde se visualizan y actualizan los datos de la cuenta local y su contraseña. | R6, R7, R8, R9 |
