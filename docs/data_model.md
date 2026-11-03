# Modelo de datos (entregable E3) — SQLite (`expo-sqlite`)

> Este archivo y las migraciones en `src/data/db/` deben coincidir siempre (criterio de
> aceptación de E3). La persistencia es 100 % local mediante `expo-sqlite` tanto en Mobile
> como en Desktop.

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

### `advice_requests` (H10, límite mensual)
| Columna | Tipo | Restricciones |
|---|---|---|
| id | INTEGER | PK autoincremental |
| year_month | TEXT | NOT NULL |
| source | TEXT | NOT NULL, `model` o `fallback` |
| created_at | TEXT | NOT NULL |

### `consents` (H12)
| Columna | Tipo | Restricciones |
|---|---|---|
| policy_version | TEXT | PK |
| accepted_at | TEXT | NOT NULL |

## Migraciones

| Versión | Cambio | Feature |
|---|---|---|
| 1 | `categories`, `expenses`, `monthly_incomes`, `consents` + categorías predefinidas | Iteración 1 (H12, H1, H5) |
| 2 | `dismissed_recurrences` | H9 |
| 3 | `advice_requests` | H10 |

Regla: nunca se modifica una migración ya publicada; se agrega una nueva versión en `src/data/db/`.
