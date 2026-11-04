# Design — h12_aviso_privacidad

> Decisiones técnicas para H12 (primera feature del orden SDD). Apoyado en
> `docs/architecture.md`, `docs/conventions.md`, `docs/data_model.md` y `docs/privacy.md`.
> Al ser la feature de orden 1, establece la infraestructura base de capas (`core`, `domain`,
> `data` con migración versión 1 y `presentation` con guardia de consentimiento).

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| core | `src/core/errors.js` | Crear jerarquía base `DomainException` y errores de validación de consentimiento (`InvalidConsent`) |
| core | `src/core/dates.js` | Crear utilidades de fecha/hora ISO 8601 sin zona (`formatIsoDateTime`, `isValidIsoDateTime`) |
| core | `src/core/responsive.js` | Crear constantes de breakpoints (`MOBILE_MAX_WIDTH = 768`, `DESKTOP_MIN_WIDTH = 1024`) y helper `getViewportLayout(width)` |
| domain | `src/domain/models/consent.js` | Crear modelo inmutable `Consent` (`Object.freeze`, `copyWith`, `isEqual`) y constantes `CURRENT_POLICY_VERSION` y `PRIVACY_NOTICE_SECTIONS` |
| domain | `src/domain/repositories/consentRepository.js` | Crear contrato `ConsentRepository` |
| data | `src/data/db/appDatabase.js` | Crear `AppDatabase` con migración versión 1 (`categories`, `expenses`, `monthly_incomes`, `consents` y semillas de categorías predefinidas) y método `openInMemory()` sobre SQLite real (`node:sqlite` / `expo-sqlite`) |
| data | `src/data/repositories/sqliteConsentRepository.js` | Crear `SqliteConsentRepository` con consultas SQL parametrizadas sobre la tabla `consents` |
| presentation | `src/features/privacy/PrivacyNoticeScreen.jsx` | Crear pantalla de aviso de privacidad (modo aceptación obligatoria en primer inicio y modo lectura en ajustes, Mobile First + Desktop) |
| presentation | `src/app/AppShell.jsx` | Crear contenedor raíz con guardia de consentimiento (bloquea el acceso hasta aceptar `CURRENT_POLICY_VERSION` y permite abrir Ajustes → Aviso de privacidad) |
| presentation | `src/App.jsx` | Conectar `AppShell` como raíz de la aplicación |
| test | `test/domain/models/consent.test.js` | Pruebas unitarias de `Consent` y textos normativos (`[H12-R3]`, `[H12-R4]`) |
| test | `test/data/sqliteConsentRepository.test.js` | Pruebas de persistencia SQLite en memoria (`[H12-R4]`, `[H12-R6]`) |
| test | `test/features/privacy/PrivacyNoticeScreen.test.jsx` | Pruebas de interfaz, bloqueo de acceso, consulta en ajustes y diseño Mobile First + Desktop (`[H12-R1]`, `[H12-R2]`, `[H12-R3]`, `[H12-R5]`, `[H12-R6]`, `[H12-R7]`, `[H12-R8]`) |

## Firmas nuevas

```javascript
// src/core/errors.js
export class DomainException extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidConsent extends DomainException {
  constructor(detail = 'Datos de consentimiento inválidos') {
    super(detail);
  }
}

// src/core/dates.js
export function formatIsoDateTime(date = new Date()) { /* YYYY-MM-DDTHH:MM:SS */ }
export function isValidIsoDateTime(value) { /* boolean */ }

// src/core/responsive.js
export const BREAKPOINTS = Object.freeze({
  tablet: 768,
  desktop: 1024,
});
export function getViewportLayout(width) {
  // devuelve { isMobile: width < 768, isTablet: width >= 768 && width < 1024, isDesktop: width >= 1024, columns: width >= 768 ? 2 : 1, containerMaxWidth: width >= 1024 ? 960 : 720 }
}

// src/domain/models/consent.js
export const CURRENT_POLICY_VERSION = '2026-10';

export const PRIVACY_NOTICE_CONTENT = Object.freeze({
  version: CURRENT_POLICY_VERSION,
  title: 'Aviso de privacidad y protección de datos personales (Ley 25.326)',
  purpose: '...',        // Finalidad del tratamiento
  localStorage: '...',   // Almacenamiento 100 % local en SQLite en el dispositivo
  thirdPartyTransfer: '...', // Transferencia sólo de resumen agregado al modelo; qué nunca sale del dispositivo
});

export class Consent {
  constructor({ policyVersion, acceptedAt }) {
    // Valida policyVersion no vacío y acceptedAt con isValidIsoDateTime, o lanza InvalidConsent
    this.policyVersion = policyVersion;
    this.acceptedAt = acceptedAt;
    Object.freeze(this);
  }

  copyWith({ policyVersion, acceptedAt } = {}) { /* ... */ }
  isEqual(other) { /* ... */ }
}

// src/domain/repositories/consentRepository.js
export class ConsentRepository {
  async findByVersion(_policyVersion) {
    throw new Error('Not implemented');
  }
  async hasAcceptedVersion(_policyVersion = CURRENT_POLICY_VERSION) {
    throw new Error('Not implemented');
  }
  async save(_consent) {
    throw new Error('Not implemented');
  }
}

// src/data/db/appDatabase.js
export class AppDatabase {
  static async openInMemory() { /* Crea instancia SQLite :memory:, activa PRAGMA foreign_keys = ON y corre migración v1 */ }
  async exec(sql) { /* ... */ }
  async run(sql, params = []) { /* ... */ }
  async get(sql, params = []) { /* ... */ }
  async all(sql, params = []) { /* ... */ }
  async close() { /* ... */ }
}

// src/data/repositories/sqliteConsentRepository.js
export class SqliteConsentRepository extends ConsentRepository {
  constructor(db) {
    super();
    this.db = db;
  }
  async findByVersion(policyVersion) { /* SELECT policy_version, accepted_at FROM consents WHERE policy_version = ? */ }
  async hasAcceptedVersion(policyVersion = CURRENT_POLICY_VERSION) { /* ... */ }
  async save(consent) { /* INSERT OR REPLACE INTO consents (policy_version, accepted_at) VALUES (?, ?) */ }
}

// src/features/privacy/PrivacyNoticeScreen.jsx
export function PrivacyNoticeScreen({
  consent = null,
  onAccept,
  onClose,
  readOnly = false,
  viewportWidth = 390,
}) { /* ... */ }
```

## Diseño Mobile First y adaptación Desktop

- **Mobile (`< 768px`):**
  - Disposición en una sola columna de ancho completo (`padding: 16px`), pensada para lectura vertical cómoda con una mano en pantallas de `360px–430px`.
  - Secciones del aviso (Finalidad, Almacenamiento local y Transferencia al proveedor de IA) apiladas verticalmente.
  - Botón primario «Aceptar y continuar» fijo al pie con altura táctil mínima de `48px` (`minHeight: 48`) y ancho del 100 %.
- **Desktop (`≥ 768px`):**
  - Contenedor centrado con ancho máximo controlado (`maxWidth: 720px` en tablet y `960px` en desktop amplio) para mantener una longitud de línea legible.
  - Las tres secciones informativas del aviso se presentan en una grilla responsiva de tarjetas (`columns: 2` / `3`) con soporte de navegación por teclado (`tabIndex`, foco visible y activación con `Enter` / `Space`).
  - En modo consulta desde Ajustes (`readOnly: true`), muestra una insignia con la versión aceptada (`2026-10`), la fecha de aceptación formateada y el botón «Volver».

## Datos (`expo-sqlite`)

- **Migración versión 1** en `src/data/db/appDatabase.js` (coincidente con `docs/data_model.md`):
  - Activa `PRAGMA foreign_keys = ON`.
  - Crea las tablas de la versión 1 del esquema:
    - `categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE, is_predefined INTEGER NOT NULL, created_at TEXT NOT NULL)`
    - `expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, amount_cents INTEGER NOT NULL CHECK (amount_cents > 0), date TEXT NOT NULL, category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT, subcategory TEXT NULL, note TEXT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)` e índices `idx_expenses_date` e `idx_expenses_category_date`.
    - `monthly_incomes (year_month TEXT PRIMARY KEY, amount_cents INTEGER NOT NULL CHECK (amount_cents > 0), updated_at TEXT NOT NULL)`
    - `consents (policy_version TEXT PRIMARY KEY, accepted_at TEXT NOT NULL)`
  - Inserta las 10 categorías predefinidas iniciales (`Alimentos`, `Transporte`, `Servicios`, `Salud`, `Ocio`, `Delivery`, `Suscripciones`, `Ropa`, `Educación`, `Otros`).
  - En entorno de pruebas Node.js (`npm test`), `AppDatabase.openInMemory()` utiliza el módulo nativo `node:sqlite` (`DatabaseSync(':memory:')`) provisto por el runtime de Node.js con una fachada asíncrona idéntica a `expo-sqlite`, ejecutando las consultas SQL reales en memoria sin agregar dependencias externas a `package.json`.

## Errores

- **Excepciones nuevas:**
  - `DomainException` en `src/core/errors.js` como clase base de errores del dominio.
  - `InvalidConsent` (hereda de `DomainException`): se lanza cuando `policyVersion` está vacío o `acceptedAt` no cumple el formato ISO 8601 `YYYY-MM-DDTHH:MM:SS`.

## Privacidad

- Cumple de forma directa con la **Ley 25.326** y las reglas 15 y 16 de `rules.md`:
  - Ninguna pantalla operativa ni servicio de asistente se monta ni ejecuta mientras `hasAcceptedVersion(CURRENT_POLICY_VERSION)` sea `false`.
  - El aviso declara explícitamente la finalidad del tratamiento, que la base SQLite (`gastos.db`) vive únicamente en el dispositivo del usuario, y que al usar el asistente (H10) solo se transfiere un resumen agregado sin notas, subcategorías, fechas individuales ni identificadores del dispositivo o del usuario.
  - Advierte también no incluir nombres de personas al crear categorías propias.

## Alternativa descartada

**Alternativa A: Guardar un booleano simple en `localStorage` / `AsyncStorage` (`consentAccepted = true`) en lugar de la tabla `consents` en SQLite.**
Se descarta porque:
1. Contradice la regla 10 de `rules.md` y `docs/data_model.md`, que exigen persistencia unificada en SQLite (`consents (policy_version, accepted_at)`).
2. Un booleano sin versión ni marca temporal impide auditar cuándo se otorgó el consentimiento (CA3) y no permite volver a solicitarlo automáticamente cuando cambie `CURRENT_POLICY_VERSION` (`docs/privacy.md`).

## Riesgos y casos borde

- **Actualización de la versión del aviso (`CURRENT_POLICY_VERSION`):** si en el futuro la versión pasa de `'2026-10'` a `'2026-11'`, la consulta por versión vigente devuelve `null` y la aplicación vuelve a mostrar el aviso y bloquear el acceso hasta que se acepte la nueva versión, conservando el historial de versiones previas en `consents`.
- **Doble clic rápido en «Aceptar y continuar»:** `SqliteConsentRepository.save` utiliza `INSERT OR REPLACE INTO consents (policy_version, accepted_at) VALUES (?, ?)`, por lo que la operación es idempotente y no arroja error de clave primaria duplicada.
- **Reloj local sin zona horaria:** `formatIsoDateTime` genera siempre `YYYY-MM-DDTHH:MM:SS` truncando milisegundos y sufijos de zona para mantener homogeneidad con el resto del modelo de datos (`docs/architecture.md` principio 7).
