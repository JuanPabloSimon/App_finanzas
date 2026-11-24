# Arquitectura — Qué significa "hacer un buen trabajo"

> Estándar de calidad del código. El reviewer evalúa contra este archivo.

## Principios

1. **Tres capas y dependencias hacia adentro.**
   - `presentation` (React + `react-dom`): pantallas, componentes y estado de la UI (`src/features/`, `src/app/`).
   - `domain` (JavaScript puro): modelos, reglas de negocio y contratos de repositorio (`src/domain/`).
   - `data` (infraestructura): SQLite detrás de `AppDatabase` (`node:sqlite` en pruebas) y `localStorage` en el navegador, implementaciones de repositorios (`src/data/`).
   `presentation → domain ← data`. El dominio **no importa** `react`, `react-dom`, `node:sqlite` ni clientes HTTP (`fetch`, `axios`).
2. **Web responsiva con enfoque Mobile First.**
   - Toda interfaz se diseña **Mobile First** (pensada primero para pantallas táctiles de 360px–430px de ancho y carga en ≤ 15 s con una mano).
   - Mediante CSS responsivo (media queries `min-width`, estilos base para móvil) (`breakpoints`: móvil `< 768px`, tablet/desktop compacto `768px–1024px`, desktop amplio `> 1024px`), las pantallas aprovechan el espacio en **Desktop** (grillas de dos columnas en tablero, navegación lateral o barra superior adaptable, soporte de teclado y puntero).
   - El stack es **React + Vite** servido como sitio estático; no hay builds nativos ni empaquetado de escritorio.
3. **Todo local.** La única salida de red es el módulo `src/assistant/`, detrás de una interfaz (`LlmClient`).
4. **Errores explícitos.** Las operaciones que pueden fallar lanzan excepciones del dominio con nombre (`ExpenseNotFound`, `InvalidAmount` heredando de `DomainException`), no devuelven `null` silencioso.
5. **Modelos inmutables.** Objetos de dominio congelados con `Object.freeze` y métodos auxiliares como `copyWith` e `isEqual`.
6. **Dinero en centavos.** Enteros (`Number.isInteger(amountCents)`). El formateo a pesos ocurre solo en la UI (`src/core/formatters.js`).
7. **Fechas sin zona.** Se guardan como texto ISO 8601 `YYYY-MM-DD` (fecha del gasto) y `YYYY-MM-DDTHH:MM:SS` (marcas de auditoría).
8. **Lógica pura y probable.** Detección de recurrencias, armado del resumen para la IA, cálculos del tablero y exportación CSV son funciones o servicios de dominio sin E/S, probados con pruebas unitarias.

## Estructura de carpetas

```
src/
├── main.jsx / App.jsx
├── app/                      # Navegación, tema, layout responsivo (Mobile First + Desktop), inyección de dependencias
├── core/                     # Formato de moneda y fechas, breakpoints responsivos, errores base, constantes
├── domain/
│   ├── models/               # Expense, Category, MonthlyIncome, Recurrence, ...
│   ├── repositories/         # Contratos/interfaces: ExpenseRepository, CategoryRepository, ...
│   └── services/             # RecurrenceDetector, DashboardCalculator, SpendingSummaryBuilder, CsvExporter
├── data/
│   ├── db/                   # AppDatabase (SQLite, migraciones versionadas)
│   └── repositories/         # Implementaciones SQLite (SqliteExpenseRepository, ...)
├── assistant/
│   ├── llmClient.js          # Contrato LlmClient
│   ├── llmConfig.js          # Clave y modelo desde VITE_LLM_API_KEY / VITE_LLM_MODEL
│   ├── httpLlmClient.js      # Google Gemini por REST (fetch inyectable); único archivo con red
│   ├── adviceResponse.js     # Validación de la respuesta y advertencia orientativa
│   ├── fallbackAdvisor.js    # Respuesta de reserva basada en reglas
│   ├── prompt.js             # Instrucciones versionadas al modelo
│   └── adviceService.js      # Orquesta: consentimiento, límite mensual, timeout, validación
└── features/
    ├── expenses/             # H1, H2, H3
    ├── categories/           # H4
    ├── income/               # H5
    ├── dashboard/            # H6, H7, H8
    ├── recurrences/          # H9
    ├── advice/               # H10
    ├── export/               # H11
    └── privacy/              # H12
test/                         # Espeja src/ (domain/, data/, assistant/, features/)
test/fixtures/                # Datos de prueba (p. ej. recurrencias_etiquetadas.json)
```

## Flujo de datos

```
UI (src/features/*) ──► estado de pantalla ──► servicios de dominio ──► repositorios (contrato)
                                                                             │
                                                        src/data/repositories (SQLite) ──► gastos.db
src/features/advice ──► AdviceService ──► SpendingSummaryBuilder (solo agregados)
                                      └─► LlmClient (red, timeout 10 s) ──► validación de formato
                                      └─► FallbackAdvisor si falla, demora o formato inválido
```

## Decisiones registradas

| Id | Decisión | Motivo | Alternativa descartada |
|---|---|---|---|
| D1 | Persistencia local: esquema SQLite detrás de `AppDatabase` (`node:sqlite` en pruebas) y `localStorage` en el navegador | Sin servidor ni costo; los datos no salen del navegador; el esquema SQL respalda el entregable E3 | Firebase / backend propio (nube, riesgo legal y alcance) |
| D2 | Proveedor del modelo aislado en `src/assistant/` | Cambiar de proveedor ante suba de tarifas (Etapa 1) | Llamar a la API desde la UI |
| D3 | Importes en centavos enteros (`Number.isInteger`) | Evitar errores de redondeo de punto flotante (`0.1 + 0.2`) | Números decimales float |
| D4 | Recurrencias por reglas determinísticas | Explicables y probables; sin datos de entrenamiento | Aprendizaje automático |
| D5 | App web React + Vite con diseño Mobile First responsivo | Un único código que corre en navegador móvil y de escritorio, sin instalación; la versión nativa (Flutter) se desarrolla en otra materia | React Native / Expo; empaquetado de escritorio (Electron/Tauri) |
| D6 | Gestión de estado con React Context + Hooks personalizados | Suficiente para la escala local de la app sin agregar boilerplate innecesario | Redux Toolkit (complejidad extra no requerida) |
| D7 | Proveedor del modelo: Groq API (`llama-3.3-70b-versatile`, OpenAI-compatible Chat Completions) por REST con `fetch` nativo inyectable en `HttpLlmClient` (H10) | Una sola llamada REST no justifica una dependencia; `fetchImpl` inyectable permite probar sin red; evita errores 503 de sobrecarga del tier gratuito de Gemini; el contrato `LlmClient` no depende de tipos del proveedor | SDK de proveedor (dependencia de runtime y peso extra en el bundle) |
| D8 | Exportación del historial (H11): `CsvExporter` puro en `src/domain/services/csvExporter.js` genera CSV para planillas es-AR (BOM UTF-8, separador `;`, CRLF, fecha `YYYY-MM-DD`, monto con coma decimal y dos decimales por aritmética entera, escape RFC 4180 y prefijo `'` ante `=`, `+`, `-`, `@`, tabulación o CR según OWASP, sin fila de totales). La entrega al navegador está aislada en `src/features/export/csvDelivery.js`: `Blob` + enlace `download` y, si `navigator.canShare({ files })` lo admite, Web Share API; sin red | El formato son unas pocas funciones puras y probables; `;` y coma decimal hacen que Excel, LibreOffice y Google Sheets en es-AR abran el archivo en columnas y que `SUMA()` coincida con la app (CA2); el BOM evita que Excel rompa los acentos | Dependencia `papaparse` (peso en el bundle sin beneficio); separador `,` con punto decimal (en es-AR abre en una sola columna y rompe el total) |

Toda decisión nueva que toque una frontera de este documento se registra acá desde el
`design.md` de la feature que la origina.

## Qué NO hacer

- No acceder a la base desde componentes de UI: siempre a través de un repositorio.
- No usar `console.log()` de depuración: mostrar un mensaje claro al usuario en la UI.
- No abrir la base en cada operación: una instancia compartida de `AppDatabase` por aplicación.
- No diseñar pantallas con anchos fijos en píxeles que se rompan en móvil o desperdicien toda la ventana en Desktop: respetar siempre el diseño **Mobile First** responsivo.
- No agregar paquetes en `package.json` "por las dudas". Cada dependencia se justifica en un `design.md`.
- No enviar a la API nada que no esté en el contrato de `docs/llm_assistant.md`.
