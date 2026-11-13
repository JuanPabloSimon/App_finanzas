# Requirements — h04_categorias_propias

> Feature #4 (H4) de `feature_list.json`: Crear categorías propias.
> «Como usuario quiero crear categorías propias y gestionar su eliminación segura para adaptar la clasificación de gastos a mi realidad cotidiana sin perder consistencia en mi historial.» Prioridad media, 3 puntos, iteración 2, orden 7.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H4-R<n>]`.

## Definiciones

- **Categoría predefinida (`isPredefined === true` / `is_predefined = 1`):** una de las diez categorías iniciales provistas por el sistema en la migración v1 (`Alimentos`, `Transporte`, `Servicios`, `Salud`, `Ocio`, `Delivery`, `Suscripciones`, `Ropa`, `Educación`, `Otros`).
- **Categoría propia (`isPredefined === false` / `is_predefined = 0`):** categoría creada por el usuario y almacenada localmente en la tabla `categories` de SQLite.
- **Unicidad sin distinguir mayúsculas (`COLLATE NOCASE`):** comparación insensible a mayúsculas y minúsculas sobre el nombre recortado (`name.trim()`), de modo que `'Mascotas'`, `'mascotas'` y `'MASCOTAS'` representan el mismo nombre.
- **Gastos asociados (`expenseCount`):** cantidad total de registros en la tabla `expenses` cuyo `category_id` referencia el `id` de la categoría en cualquier período mensual.

## R1
CUANDO el usuario ingresa un nombre válido (no vacío tras recortar espacios) que no coincide sin distinguir mayúsculas ni minúsculas (`COLLATE NOCASE`) con ninguna categoría existente y confirma el alta, el sistema DEBE crear y persistir una categoría propia (`is_predefined = 0`) en la tabla `categories` con su fecha de creación en formato ISO 8601 (`YYYY-MM-DDTHH:MM:SS`).

## R2
CUANDO se crea una nueva categoría propia, el sistema DEBE actualizar de inmediato el listado de categorías y dejarla disponible para seleccionarse en el formulario de carga de gastos sin reiniciar la aplicación.

## R3
SI el usuario intenta crear una categoría con un nombre vacío o compuesto solo por espacios en blanco ENTONCES el sistema NO DEBE guardar el registro en la base de datos e informará el error de validación (`InvalidCategory`).

## R4
SI el usuario intenta crear una categoría cuyo nombre recortado (`trim`) repite el de una categoría existente (predefinida o propia) sin distinguir mayúsculas ni minúsculas ENTONCES el sistema NO DEBE crear el duplicado e informará el error de dominio (`DuplicateCategory`).

## R5
SI se solicita eliminar una categoría marcada como predefinida (`isPredefined === true` / `is_predefined = 1`) o una categoría inexistente ENTONCES el sistema NO DEBE borrarla de la tabla `categories` (lanzando `PredefinedCategoryDeletionNotAllowed` o `CategoryNotFound`) y en la interfaz omitirá o deshabilitará la acción de eliminar sobre las categorías predefinidas.

## R6
CUANDO el usuario confirma la eliminación de una categoría propia (`isPredefined === false`) que no tiene gastos asociados (`expenseCount === 0`), el sistema DEBE borrar el registro de la tabla `categories` en SQLite y quitarla del selector de carga de gastos.

## R7
SI el usuario solicita eliminar una categoría propia que tiene uno o más gastos asociados (`expenseCount > 0`) ENTONCES el sistema DEBE exigir la selección de una categoría de destino distinta y existente, reasignar todos los gastos asociados hacia esa categoría de destino y recién después eliminar la categoría propia de la tabla `categories` (bloqueando el borrado directo con `CategoryInUse` si no se indica categoría de reasignación).

## R8
El sistema DEBE presentar la gestión de categorías propias (alta, listado con distinción entre predefinidas y propias, eliminación y flujo de reasignación de gastos) con diseño Mobile First (`< 768px`, controles táctiles `≥ 44px` en una columna) y adaptación responsiva para pantallas Tablet/Desktop (`≥ 768px`, disposición en grilla con navegación por teclado).

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. El usuario crea una categoría con un nombre que no repite otro existente, sin distinguir mayúsculas, y queda disponible en la carga. | R1, R2, R3, R4, R8 |
| CA2. Las categorías predefinidas no pueden eliminarse, y una categoría propia con gastos asociados solo se elimina después de reasignarlos. | R5, R6, R7, R8 |
| Reglas de arquitectura y diseño (`docs/architecture.md`, `docs/conventions.md`, `docs/data_model.md`, `rules.md`: excepciones de dominio explícitas, FK `ON DELETE RESTRICT`, Mobile First + Desktop) | R1, R3, R4, R5, R6, R7, R8 |

## Fuera de alcance de esta feature

- Renombrado o fusión masiva de categorías predefinidas del sistema.
- Asignación de íconos personalizados o presupuestos específicos por categoría (no incluidos en la línea base de `docs/product.md`).
