# Requirements — h13_refactor_ux_gestix

> Feature #13 (H13) de `feature_list.json`: Refactor UX Ge$tix: dashboard sin scroll, navegación inferior en tarjetas, header limpio con perfil y contraste de monto.
> «Como usuario quiero que la pestaña principal de Resumen sea exclusivamente informativa y entre en el viewport sin scroll vertical, que cada acción y su listado estén separados en pestañas accesibles desde tarjetas inferiores que se elevan y cambian de color al seleccionarse, que el header mobile sea de ancho completo mostrando únicamente "Ge$tix" y un ícono de perfil desde donde editar mi cuenta, consultar privacidad o cerrar sesión, y que los campos de monto tengan alto contraste visual.» Prioridad alta, 5 puntos, iteración 2, orden 8.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H13-R<n>]`.

## Definiciones

- **Vista de Resumen sin scroll (`activeTab === 'overview'`):** pestaña principal posterior al inicio de sesión que presenta exclusivamente información ejecutiva consolidada (selector compacto de período, grilla de indicadores clave, barra de asignación del ingreso y gráfico compacto de distribución por categoría) contenida en el alto de la ventana (`maxHeight: '100dvh'` / `overflowY: 'hidden'` en el contenedor del dashboard) sin formularios de carga embebidos.
- **Barra de navegación inferior en tarjetas (`overview-tabs`):** dock inferior fijo con cinco tarjetas interactivas (`tab-overview`, `tab-expenses`, `tab-income`, `tab-investments`, `tab-reminders`) donde la tarjeta activa cambia a color de acento corporativo y se desplaza verticalmente hacia arriba (`transform: 'translateY(-8px)'`).
- **Header limpio Ge$tix (`app-header`):** barra superior que en modo mobile (`< 768px`) carece de márgenes exteriores (`margin: 0`, `borderRadius: 0`) y exhibe únicamente la marca `"Ge$tix"` y el botón de perfil (`profile-menu-button`), concentrando dentro del menú/panel de perfil (`profile-menu-popover`) la edición de datos de cuenta, el acceso discreto al aviso de privacidad (`open-settings-privacy-button`) y el cierre de sesión (`logout-button`).
- **Campo de monto de alto contraste:** control numérico de entrada (`expense-amount-input`, `income-amount-input`, `investment-amount-input`) con fondo blanco explícito (`#FFFFFF`), texto oscuro corporativo (`#0B192C` / `#0F2942`), cursor visible (`caretColor: '#0B192C'`) y esquema claro (`colorScheme: 'light'`).

## R1
MIENTRAS la pestaña activa sea Resumen (`activeTab === 'overview'`), el sistema DEBE mostrar una vista exclusivamente informativa que entre en el viewport sin scroll vertical (`overflowY: 'hidden'`), presentando el período activo, los cuatro indicadores patrimoniales (ingreso, gastos, inversiones y balance disponible), la barra de asignación de capital y el gráfico compacto de distribución por categoría.

## R2
MIENTRAS la pestaña activa sea Resumen (`activeTab === 'overview'`), el sistema NO DEBE renderizar en esa vista los formularios de carga de ingresos (`monthly-income-form`), de inversiones (`investment-registry-form`), de recordatorios (`reminder-form`) ni de gastos (`expense-form`).

## R3
El sistema DEBE separar las acciones operativas y sus listados relacionados en cinco pestañas dedicadas (`overview` para Resumen, `expenses` para Gastos, `income` para Ingresos y su desglose de absorción por categoría, `investments` para Inversiones y su cartera registrada, y `reminders` para Alertas, vencimientos y consejos), mostrando en cada pestaña únicamente el contenido correspondiente a esa sección.

## R4
CUANDO el usuario visualiza el panel principal o selecciona una sección en la barra inferior (`overview-tabs`), el sistema DEBE presentar las cinco opciones como tarjetas en el borde inferior y destacar la tarjeta seleccionada cambiando su color de fondo al acento corporativo y desplazándola hacia arriba (`transform: 'translateY(-8px)'`).

## R5
MIENTRAS la aplicación se ejecute en modo mobile (`viewportWidth < 768`), el sistema DEBE renderizar el contenedor principal y el header (`app-header`) sin márgenes exteriores (`margin: 0`, `borderRadius: 0`), mostrando en la barra superior únicamente el título `"Ge$tix"` y el botón con ícono de perfil (`profile-menu-button`) sin otros botones sueltos en el header.

## R6
CUANDO el usuario activa el ícono de perfil (`profile-menu-button`), el sistema DEBE desplegar el panel de perfil (`profile-menu-popover`) con las opciones para editar la información del perfil (`fullName` y `username`), acceder de forma discreta al aviso de privacidad (`open-settings-privacy-button`) y cerrar la sesión activa (`logout-button`).

## R7
CUANDO el usuario guarda cambios válidos de su perfil (`fullName` no vacío y `username` de al menos 3 caracteres que no colisione con otra cuenta), el sistema DEBE actualizar la cuenta local en el repositorio (`updateProfile`) y reflejar de inmediato los nuevos datos del usuario en el estado activo sin reiniciar la aplicación.

## R8
CUANDO se renderiza el campo de monto para cargar un gasto (`expense-amount-input`), un ingreso (`income-amount-input`) o una inversión (`investment-amount-input`), el sistema DEBE aplicar estilos explícitos de alto contraste con fondo blanco (`backgroundColor: '#FFFFFF'`), texto numérico oscuro (`color: '#0B192C'`), borde reforzado (`borderStrong`), `caretColor: '#0B192C'` y `colorScheme: 'light'`.

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. Luego del login, la pestaña principal de Resumen es exclusivamente informativa y toda su información entra en el viewport sin scroll vertical. | R1, R2 |
| CA2. Las acciones y sus listados relacionados se separan en pestañas dedicadas (Resumen, Gastos, Ingresos, Inversiones y Alertas), accesibles desde el borde inferior mediante pequeñas tarjetas que al seleccionarse cambian de color y se destacan desplazándose hacia arriba. | R2, R3, R4 |
| CA3. En modo mobile el header no tiene márgenes exteriores y muestra únicamente el título "Ge$tix" y un ícono de perfil sin otros botones; al tocar el ícono permite editar la información del perfil, acceder de forma discreta al aviso de privacidad o cerrar sesión. | R5, R6, R7 |
| CA4. Al cargar un gasto (o ingreso/inversión), el recuadro de monto presenta alto contraste explícito entre el fondo del input y el texto numérico. | R8 |
