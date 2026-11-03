# Arquitectura — Qué significa "hacer un buen trabajo"

> Estándar de calidad del código. El reviewer evalúa contra este archivo.

## Principios

1. **Tres capas y dependencias hacia adentro.**
   - `presentation` (React Native): pantallas, componentes y estado de la UI (`src/features/`, `src/app/`).
   - `domain` (JavaScript puro): modelos, reglas de negocio y contratos de repositorio (`src/domain/`).
   - `data` (infraestructura): SQLite con `expo-sqlite`, implementaciones de repositorios (`src/data/`).
   `presentation → domain ← data`. El dominio **no importa** `react`, `react-native`, `expo-sqlite` ni clientes HTTP (`fetch`, `axios`).
2. **Multiplataforma Mobile + Desktop con enfoque Mobile First.**
   - Toda interfaz se diseña **Mobile First** (pensada primero para pantallas táctiles de 360px–430px de ancho y carga en ≤ 15 s con una mano).
   - Mediante `useWindowDimensions` y estilos responsivos (`breakpoints`: móvil `< 768px`, tablet/desktop compacto `768px–1024px`, desktop amplio `> 1024px`), las pantallas aprovechan el espacio en **Desktop** (grillas de dos columnas en tablero, navegación lateral o barra superior adaptable, soporte de teclado y puntero).
   - El stack utiliza **Expo** (React Native + React Native Web / Electron / Tauri para Desktop) y **React Native CLI** (`react-native-windows` / `react-native-macos`).
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
│   ├── db/                   # AppDatabase (apertura con expo-sqlite, migraciones versionadas)
│   └── repositories/         # Implementaciones SQLite (SqliteExpenseRepository, ...)
├── assistant/
│   ├── llmClient.js          # Contrato LlmClient
│   ├── httpLlmClient.js      # Implementación HTTP con el proveedor elegido
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
                                                        src/data/repositories (expo-sqlite) ──► gastos.db
src/features/advice ──► AdviceService ──► SpendingSummaryBuilder (solo agregados)
                                      └─► LlmClient (red, timeout 10 s) ──► validación de formato
                                      └─► FallbackAdvisor si falla, demora o formato inválido
```

## Decisiones registradas

| Id | Decisión | Motivo | Alternativa descartada |
|---|---|---|---|
| D1 | SQLite local con `expo-sqlite` | Sin servidor ni costo; datos no salen del dispositivo móvil ni de escritorio | Firebase / backend propio (nube, riesgo legal y alcance) |
| D2 | Proveedor del modelo aislado en `src/assistant/` | Cambiar de proveedor ante suba de tarifas (Etapa 1) | Llamar a la API desde la UI |
| D3 | Importes en centavos enteros (`Number.isInteger`) | Evitar errores de redondeo de punto flotante (`0.1 + 0.2`) | Números decimales float |
| D4 | Recurrencias por reglas determinísticas | Explicables y probables; sin datos de entrenamiento | Aprendizaje automático |
| D5 | React Native (JS) con Expo + soporte Desktop (RN Web / Electron / Tauri / RN Windows-macOS) y diseño Mobile First | Un único código base en JavaScript para Mobile y Desktop priorizando la carga rápida móvil | Desarrollos nativos separados por plataforma |
| D6 | Gestión de estado con React Context + Hooks personalizados | Suficiente para la escala local de la app sin agregar boilerplate innecesario | Redux Toolkit (complejidad extra no requerida) |

Toda decisión nueva que toque una frontera de este documento se registra acá desde el
`design.md` de la feature que la origina.

## Qué NO hacer

- No acceder a la base desde componentes de UI: siempre a través de un repositorio.
- No usar `console.log()` de depuración: mostrar un mensaje claro al usuario en la UI.
- No abrir la base en cada operación: una instancia compartida de `AppDatabase` por aplicación.
- No diseñar pantallas con anchos fijos en píxeles que se rompan en móvil o desperdicien toda la ventana en Desktop: respetar siempre el diseño **Mobile First** responsivo.
- No agregar paquetes en `package.json` "por las dudas". Cada dependencia se justifica en un `design.md`.
- No enviar a la API nada que no esté en el contrato de `docs/llm_assistant.md`.
