# Requirements — h16_modal_consejos_agente

> Feature #16 (H16) de `feature_list.json`: Mudar recomendaciones al Resumen con botón Consejos Agente y modal con persistencia diaria.
> «Como usuario quiero acceder a las recomendaciones del asistente desde un botón "Consejos Agente" ubicado debajo de todo en la pestaña Resumen, que al presionarlo abra un modal donde pueda pedir los consejos o ver directamente los últimos consejos solicitados si ya pedí ese día.» Prioridad alta, 3 puntos, iteración 3, orden 16.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H16-R<n>]`.

## Definiciones

- **Botón `Consejos Agente` (`data-testid="open-agent-advice-modal-button"`):** acción ubicada al pie del contenedor principal de la pestaña `Resumen` (`activeTab === 'overview'`) que abre el modal de recomendaciones sin agregar scroll vertical a `overview-viewport-box`.
- **Modal `Consejos Agente` (`data-testid="agent-advice-modal"`):** cuadro de diálogo modal (`role="dialog"`, `aria-modal="true"`) que encapsula `RecommendationsPanel`, un encabezado con botón de cierre (`data-testid="close-agent-advice-modal-button"`) y el indicador del último resultado del día (`data-testid="agent-advice-last-requested-badge"`).
- **Snapshot diario de consejos (`dailyAdviceSnapshot`):** registro local del último resultado de recomendaciones (`{ date, yearMonth, suggestions, source, reason }`) solicitado en la fecha calendario local `today()` (`YYYY-MM-DD`) para el período activo (`yearMonth`).

## R1
CUANDO la pestaña activa es `Resumen` (`activeTab === 'overview'`), el sistema DEBE mostrar debajo de todo el bloque informativo el botón «Consejos Agente» (`data-testid="open-agent-advice-modal-button"`) manteniendo el contenedor `overview-viewport-box` sin scroll vertical (`overflowY: 'hidden'`), y NO DEBE renderizar `RecommendationsPanel` en la pestaña `Alertas` (`activeTab === 'reminders'`).

## R2
MIENTRAS el usuario no haya presionado el botón «Consejos Agente», el sistema DEBE mantener cerrado el modal (`isAdviceModalOpen === false`) sin renderizar `data-testid="agent-advice-modal"` ni `data-testid="recommendations-panel"`, y CUANDO el usuario presiona «Consejos Agente» (`openAdviceModal()`) DEBE abrir el modal y permitir cerrarlo con `data-testid="close-agent-advice-modal-button"` (`closeAdviceModal()`).

## R3
SI el usuario aún no ha solicitado consejos en el día actual (`today()`) para el período activo ENTONCES al abrir el modal «Consejos Agente» el sistema DEBE mostrar el estado inicial (`status: 'idle'`) con el botón para pedir los consejos (`data-testid="recommendations-request-button"`, «Pedir recomendaciones») sin invocar automáticamente al `LlmClient`.

## R4
CUANDO el usuario presiona el botón para pedir recomendaciones dentro del modal «Consejos Agente» (`requestAdvice()`), el sistema DEBE consultar a `AdviceService`, mostrar en el modal las sugerencias obtenidas con su origen y la advertencia orientativa literal, y guardar el resultado como el último consejo solicitado del día (`saveDailyAdviceSnapshot`) en el repositorio local.

## R5
SI el usuario ya solicitó consejos en el día actual (`today()`) para el período activo ENTONCES al cerrar y volver a abrir el modal —o al reinicializar la pantalla en ese mismo día— el sistema DEBE mostrar inmediatamente en el modal los últimos consejos solicitados ese día (`status: 'ready'`, sugerencias, origen, advertencia e indicador `data-testid="agent-advice-last-requested-badge"`) sin volver a invocar al `LlmClient`.

## R6
CUANDO cambia la fecha calendario local (`today()`) a un nuevo día respecto del último snapshot guardado, el sistema DEBE descartar el snapshot del día anterior e iniciar el modal en estado `idle` mostrando el botón para pedir los consejos del nuevo día.

## R7
El sistema DEBE adaptar el botón «Consejos Agente» y el modal `agent-advice-modal` con enfoque Mobile First (`< 768px`) y soporte Desktop (`>= 1024px`), garantizando objetivos táctiles accesibles (`minHeight >= 38px` en mobile y `>= 42px` en desktop) y navegación por teclado (`tabIndex: 0`).

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. El módulo de recomendaciones se traslada desde la pestaña Alertas a la pestaña Resumen, mostrando debajo de todo un botón «Consejos Agente» sin perder el bloqueo de scroll vertical del Resumen. | R1, R2, R7 |
| CA2. Al presionar «Consejos Agente» se abre un modal con el panel del asistente que muestra el botón para pedir los consejos si aún no se solicitaron en el día. | R2, R3, R4, R7 |
| CA3. Si el usuario ya solicitó consejos en ese día, al abrir el modal se muestran directamente los últimos consejos solicitados en el día junto con la opción de volver a consultar o cerrar el modal. | R4, R5, R6 |
