# Modelo de datos (entregable E3) — SQLite

> Este archivo y las migraciones en `src/data/db/` deben coincidir siempre (criterio de
> aceptación de E3). La persistencia es 100 % local: el esquema se ejecuta con `node:sqlite` en las
> pruebas y, en el navegador, el estado se guarda en `localStorage`.

Base: `gastos.db`. Claves foráneas activadas (`PRAGMA foreign_keys = ON`).

## Tablas

### `categories`
| Columna | Tipo | Restricciones |
|---|---|---|
| id | INTEGER | PK autoincremental |
| name | TEXT | NOT NULL, único sin distinguir mayúsculas (`COLLATE NOCASE`) |
| is_predefined | INTEGER | NOT NULL, 0/1 |
| created_at | TEXT | NOT NULL, ISO 8601 |

Categorías predefinidas sugeridas: Alimentos, Transporte, Servicios, Salud, Ocio,
Delivery, Suscripciones, Ropa, Educación, Otros.

### `expenses`
| Columna | Tipo | Restricciones |
|---|---|---|
| id | INTEGER | PK autoincremental |
| amount_cents | INTEGER | NOT NULL, CHECK (amount_cents > 0) |
| date | TEXT | NOT NULL, `YYYY-MM-DD` |
| category_id | INTEGER | NOT NULL, FK → categories(id) ON DELETE RESTRICT |
| subcategory | TEXT | NULL |
| note | TEXT | NULL |
| created_at | TEXT | NOT NULL |
| updated_at | TEXT | NOT NULL |

Índices: `idx_expenses_date (date)`, `idx_expenses_category_date (category_id, date)`.

### `monthly_incomes`
| Columna | Tipo | Restricciones |
|---|---|---|
| year_month | TEXT | PK, `YYYY-MM` |
| amount_cents | INTEGER | NOT NULL, CHECK (amount_cents > 0) |
| updated_at | TEXT | NOT NULL |

### `dismissed_recurrences` (H9)
| Columna | Tipo | Restricciones |
|---|---|---|
| recurrence_key | TEXT | PK (ver `specs/h09_deteccion_recurrencias/design.md`) |
| dismissed_at | TEXT | NOT NULL |

Formato de `recurrence_key`: `<categoryId>|<typicalAmountCents>` (por ejemplo `7|650000`), con
`categoryId` y `typicalAmountCents` enteros positivos (monto típico = mediana en centavos). Una
recurrencia detectada se oculta si existe una clave con la misma categoría y un monto típico
guardado a no más de 10 % del detectado (con el guardado como base). `dismissed_at` es ISO 8601
(`YYYY-MM-DDTHH:MM:SS`). La clave no contiene notas, fechas ni identificadores del usuario.

En el navegador, `LocalStorageRecurrenceRepository` guarda la misma información bajo la clave
`fp_dismissed_recurrences` de `localStorage`, como arreglo JSON `[{ recurrenceKey, dismissedAt }]`
sin duplicados.

### `advice_requests` (H10, límite mensual)
| Columna | Tipo | Restricciones |
|---|---|---|
| id | INTEGER | PK autoincremental |
| year_month | TEXT | NOT NULL, `YYYY-MM` (mes **local** de la consulta, no el período navegado) |
| source | TEXT | NOT NULL, CHECK (source IN ('model', 'fallback')) |
| created_at | TEXT | NOT NULL, ISO 8601 local (`YYYY-MM-DDTHH:MM:SS`) |

Índice: `idx_advice_requests_year_month (year_month)`.

Semántica de `source`:
- `model`: se invocó al proveedor del modelo de lenguaje. Consume cupo (4 por mes y por
  navegador) con cualquier resultado: éxito, timeout, error o respuesta inválida. La fila se
  registra **antes** de invocar.
- `fallback`: la solicitud se resolvió con la respuesta de reserva sin invocar al modelo (sin
  clave, sin datos o con el cupo agotado). No cuenta para el cupo.

Ninguna columna guarda el resumen enviado, la respuesta del modelo ni identificadores del usuario
o del dispositivo.

En el navegador, `LocalStorageAdviceRequestRepository` guarda la misma información bajo la clave
`fp_advice_requests` de `localStorage`, como arreglo JSON `[{ id, yearMonth, source, createdAt }]`
con `id = max(id) + 1`. Un JSON inválido se lee como vacío; un error de escritura (cuota) se
propaga para que no se invoque al modelo sin registro.

### `consents` (H12)
| Columna | Tipo | Restricciones |
|---|---|---|
| policy_version | TEXT | PK |
| accepted_at | TEXT | NOT NULL |

### `user_accounts` (Cuenta local del dispositivo)
| Columna | Tipo | Restricciones |
|---|---|---|
| id | INTEGER | PK autoincremental |
| full_name | TEXT | NOT NULL |
| username | TEXT | NOT NULL, único (`COLLATE NOCASE`) |
| password_hash | TEXT | NOT NULL |
| created_at | TEXT | NOT NULL |

### `investments` (Control de gestión de capital invertido)
| Columna | Tipo | Restricciones |
|---|---|---|
| id | INTEGER | PK autoincremental |
| asset_name | TEXT | NOT NULL (ej. Plazo Fijo, FCI, CEDEAR, Bono) |
| platform | TEXT | NOT NULL (ej. Banco Nación, Balanz, IOL) |
| amount_cents | INTEGER | NOT NULL, CHECK (amount_cents > 0) |
| date | TEXT | NOT NULL, `YYYY-MM-DD` |
| due_date | TEXT | NULL, `YYYY-MM-DD` (fecha de vencimiento para recordatorio) |
| note | TEXT | NULL (ej. TNA / detalle) |
| created_at | TEXT | NOT NULL |

### `reminders` (Recordatorios financieros y de vencimientos)
| Columna | Tipo | Restricciones |
|---|---|---|
| id | INTEGER | PK autoincremental |
| title | TEXT | NOT NULL |
| due_date | TEXT | NOT NULL, `YYYY-MM-DD` |
| amount_cents | INTEGER | NULL |
| is_completed | INTEGER | NOT NULL, 0/1 |
| created_at | TEXT | NOT NULL |

## Migraciones

| Versión | Cambio | Feature |
|---|---|---|
| 1 | `categories`, `expenses`, `monthly_incomes`, `consents` + categorías predefinidas | Iteración 1 (H12, H1, H5) |
| 2 | `user_accounts`, `investments`, `reminders` | H5 y Panel de Resumen General |
| 3 | `dismissed_recurrences` | H9 |
| 4 | `advice_requests` | H10 |

Regla: nunca se modifica una migración ya publicada; se agrega una nueva versión en `src/data/db/`.
