# Requirements — h12_aviso_privacidad

> Feature #12 (H12) de `feature_list.json`: Aviso de privacidad y consentimiento.
> «Como usuario quiero conocer cómo se tratan mis datos financieros y dar mi consentimiento explícito antes de usar la aplicación, en cumplimiento de la Ley 25.326.» Prioridad alta, 2 puntos, iteración 1, orden 1.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H12-R<n>]`.

## Definiciones

- **Versión vigente del aviso (`CURRENT_POLICY_VERSION`):** identificador de versión del texto normativo del aviso de privacidad (valor inicial `'2026-10'`).
- **Consentimiento válido:** registro en la tabla `consents` cuyo `policy_version` coincide con `CURRENT_POLICY_VERSION` y posee una marca temporal `accepted_at` en formato ISO 8601 sin zona (`YYYY-MM-DDTHH:MM:SS`).
- **Contenido obligatorio del aviso:** declaración expresa de (1) la finalidad del tratamiento (registro, clasificación, detección de recurrencias y recomendaciones orientativas), (2) el almacenamiento exclusivamente local en SQLite dentro del dispositivo sin servidores propios, y (3) la transferencia al proveedor del modelo de lenguaje externo limitada a un resumen agregado sin notas, subcategorías, fechas individuales ni identificadores personales o del dispositivo.

## R1
CUANDO la aplicación se inicia y no existe un consentimiento registrado para la versión vigente del aviso, el sistema DEBE mostrar la pantalla del aviso de privacidad antes que cualquier otra pantalla de la aplicación.

## R2
MIENTRAS el usuario no haya aceptado la versión vigente del aviso de privacidad, el sistema NO DEBE permitir el acceso a las pantallas ni funcionalidades principales de la aplicación.

## R3
El sistema DEBE mostrar en el aviso de privacidad la finalidad del tratamiento de los datos, el almacenamiento exclusivamente local en el dispositivo y las condiciones de transferencia del resumen agregado al proveedor del modelo de lenguaje externo.

## R4
CUANDO el usuario confirma la aceptación del aviso de privacidad vigente, el sistema DEBE guardar en la tabla `consents` la versión del aviso (`policy_version`) y la fecha y hora de aceptación (`accepted_at`) en formato ISO 8601 (`YYYY-MM-DDTHH:MM:SS`).

## R5
CUANDO el usuario confirma la aceptación del aviso de privacidad vigente, el sistema DEBE desbloquear de inmediato la navegación hacia la pantalla principal de la aplicación sin requerir reinicio.

## R6
MIENTRAS exista un consentimiento registrado en la tabla `consents` para la versión vigente del aviso, el sistema DEBE iniciar directamente en la pantalla principal sin volver a solicitar la aceptación.

## R7
CUANDO el usuario accede a la sección de ajustes de la aplicación, el sistema DEBE mostrar nuevamente el texto completo del aviso de privacidad junto con la versión aceptada y la fecha de aceptación registrada.

## R8
El sistema DEBE presentar la pantalla del aviso de privacidad y su consulta desde ajustes con una disposición Mobile First (`< 768px`) y adaptación responsiva para pantallas Desktop (`≥ 768px`).

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. En el primer inicio se muestra el aviso de privacidad y, sin aceptarlo, no es posible acceder a la aplicación. | R1, R2, R5, R6 |
| CA2. El aviso informa la finalidad, el almacenamiento local y la transferencia al proveedor del modelo, y puede consultarse luego desde los ajustes. | R3, R7, R8 |
| CA3. La aceptación queda registrada con su fecha. | R4, R6, R7 |
| Reglas de arquitectura y diseño (Mobile First + Desktop, Ley 25.326) | R2, R3, R8 |

## Fuera de alcance de esta feature

- Llamadas reales o simuladas a la API del modelo de lenguaje (corresponde a H10, que consultará el estado del consentimiento antes de invocar al cliente).
- Revocación del consentimiento con borrado remoto (no existen servidores propios; los datos residen únicamente en el dispositivo local).
- Autenticación de usuarios o sincronización de consentimientos en la nube.
