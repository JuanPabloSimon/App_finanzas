# Convenciones de código

> Homogeneidad extrema: la IA predice mejor cuando el repositorio se parece a sí mismo.

## JavaScript y React Native (Mobile First + Desktop)

- Lenguaje: **JavaScript (ES Modules)** en todo el proyecto (`import` / `export`).
- Linter: ESLint (`npm run lint`) sin errores ni advertencias.
- Componentes funcionales con Hooks; componentes pequeños y componibles.
- Enfoque **Mobile First**:
  - Los estilos base se definen para pantallas móviles (`< 768px`).
  - Las adaptaciones para **Desktop** (`≥ 768px` y `≥ 1024px`) se aplican mediante `useWindowDimensions` o el helper central en `src/core/responsive.js` (por ejemplo, contenedores centrados con `maxWidth`, grillas multicolumna en el tablero y soporte de eventos de teclado/foco además de gestos táctiles).
- Modelos del dominio inmutables (`Object.freeze`) con validación en el constructor o fábrica.
- Sin `console.log()` de depuración, sin código comentado y sin `TODO` sin contexto.

## Idioma

| Qué | Idioma | Ejemplo |
|---|---|---|
| Identificadores (clases, funciones, variables, archivos) | Inglés | `RecurrenceDetector`, `amountCents` |
| Textos visibles al usuario | Español rioplatense | `'Ingresá un monto mayor que cero'` |
| Descripciones de pruebas | Español, con etiqueta | `'[H9-R2] no marca grupos de menos de 3 gastos'` |
| Documentación, specs, commits | Español | `feat(h9): detector de recurrencias` |

## Nombres

| Tipo | Convención | Ejemplo |
|---|---|---|
| Archivos de lógica / dominio / datos | `camelCase.js` | `recurrenceDetector.js` |
| Archivos de componentes y pantallas | `PascalCase.jsx` | `ExpenseFormScreen.jsx` |
| Clases y componentes React | `PascalCase` | `Expense`, `RecurrenceDetector`, `ExpenseFormScreen` |
| Funciones, métodos y variables | `camelCase` | `detectRecurrences`, `amountCents` |
| Constantes globales | `UPPER_SNAKE_CASE` o `camelCase` | `MIN_OCCURRENCES = 3` |
| Pantallas | sufijo `Screen` | `ExpenseFormScreen` |
| Repositorios | `XRepository` (contrato) y `SqliteXRepository` | `ExpenseRepository`, `SqliteExpenseRepository` |

## Errores

```javascript
export class DomainException extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidAmount extends DomainException {
  constructor() {
    super('El monto debe ser mayor que cero');
  }
}

export class ExpenseNotFound extends DomainException {
  constructor(id) {
    super(`No existe el gasto ${id}`);
  }
}
```

La UI captura `DomainException`, muestra `error.message` al usuario y nunca un stack trace.

## Pruebas

- Un archivo por unidad en `test/` espejando `src/`: por ejemplo `test/domain/services/recurrenceDetector.test.js`.
- Bloques `describe('H9 detección de recurrencias', ...)` y cada `test` / `it` con su etiqueta `[H9-R<n>]`.
  Una prueba puede cubrir más de un requisito: `'[H9-R1][H9-R3] agrupa montos ±10 %'`.
- Persistencia: base SQLite en memoria (usando adaptador SQLite en memoria compatible con el contrato de `AppDatabase` / `expo-sqlite`); una base limpia por prueba.
- UI / Componentes: pruebas de renderizado e interacción verificando textos, estados de error y adaptación Mobile/Desktop.
- Asistente: `FakeLlmClient` que devuelve respuestas fijas, lentas o mal formadas. Ninguna prueba usa red.
- Nombres descriptivos del comportamiento, no de la implementación.

## Comentarios

Por defecto no se escriben. Solo explican un *por qué* no obvio (una regla del negocio, un
límite de una biblioteca). Los nombres hacen el resto.
