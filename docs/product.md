# Producto — Qué se construye y qué no

> Resumen operativo del Documento de Proyecto ([`docs/Proyecto_Tec_Laborales_Grupo_3.pdf`](./Proyecto_Tec_Laborales_Grupo_3.pdf), Etapas 1, 2 y 3). Si algo no está acá ni en
> `feature_list.json`, **no está en el alcance**.

## Propósito

Que una persona registre y clasifique sus gastos cotidianos, vea cómo se distribuye su
dinero, detecte gastos recurrentes de bajo valor percibido y reciba recomendaciones
automatizadas para reducir el gasto no deseado. El valor final: decidir sobre el dinero
con datos y no con impresiones.

## Usuario destinatario

Persona de 20 a 40 años, con ingresos propios, que administra su dinero de forma
individual, combina efectivo con medios digitales, opera con varias billeteras y usa su
dispositivo móvil en la calle y su computadora de escritorio en su casa o trabajo. Hoy no
lleva registro de sus gastos o lo abandonó. **El factor crítico es la simplicidad de la
carga**: la competencia real es el desuso.

## Alcance del producto (línea base)

- Cuenta de usuario local en el dispositivo (registro e inicio de sesión local para proteger y personalizar el panel sin depender de servidores en la nube).
- Panel de Resumen General del Mes (Dashboard Mobile First + Desktop) con paleta sobria/corporativa (azul marino `#0F2942` y marrón oscuro `#4A3525`).
- Registro manual de gastos: monto, fecha, categoría, subcategoría opcional y nota.
- Categorías predefinidas y categorías propias.
- Ingreso mensual, cálculo de balance disponible y proporción que cada categoría representa sobre el ingreso.
- Registro informativo de inversiones para control de gestión del capital (monto, activo como Plazo Fijo/FCI/Bono/CEDEAR, plataforma/entidad y fecha de vencimiento opcional) y recordatorios de vencimientos.
- Tablero: distribución por categoría, evolución mensual, comparación con el mes anterior y
  ranking de categorías.
- Detección de gastos recurrentes mediante **reglas** sobre el historial.
- Recomendaciones en lenguaje natural a partir de un **resumen agregado** enviado a la API
  de un modelo de lenguaje externo, con respuesta de reserva basada en reglas.
- Exportación del historial a un archivo CSV.
- Aviso de privacidad con consentimiento explícito en el primer inicio.
- **Stack multiplataforma Mobile + Desktop con enfoque Mobile First:**
  - **React Native (JavaScript)** con **Expo** (React Native + React Native Web / Electron /
    Tauri para Desktop) y **React Native CLI** (`react-native-windows` / `react-native-macos`).
  - Diseño **Mobile First** que escala de forma responsiva a pantallas de escritorio.
  - Almacenamiento local en SQLite mediante `expo-sqlite`.

## Límites (fuera del alcance)

- Integración con bancos, tarjetas, brokers o banca abierta. **Es el límite más relevante.**
- Procesamiento de pagos, ejecución de inversiones u operaciones con movimiento de dinero real (la app es exclusivamente de registro y control de gestión).
- Sincronización en la nube entre dispositivos o servidores externos de cuentas.
- Entrenamiento de un modelo de IA propio.
- Asesoramiento financiero profesional (las sugerencias son orientativas).
- Cuentas compartidas; múltiples monedas.
- Lectura automática de comprobantes (OCR).
- Publicación en tiendas oficiales durante el cursado.

## Historias y prioridades

| Id | Historia | Épica | Prioridad | Pts | Iteración | Orden SDD |
|---|---|---|---|---|---|---|
| H12 | Aviso de privacidad | Resguardo | Alta | 2 | 1 | 1 |
| H1 | Registrar un gasto | Registro | Alta | 5 | 1 | 2 |
| H2 | Editar o eliminar un gasto | Registro | Alta | 2 | 1 | 3 |
| H3 | Listado del mes | Registro | Alta | 3 | 1 | 4 |
| H5 | Ingreso mensual | Registro | Media | 2 | 1 | 5 |
| H6 | Gráfico por categoría | Visualización | Alta | 5 | 2 | 6 |
| H4 | Categorías propias | Registro | Media | 3 | 2 | 7 |
| H8 | Ranking de categorías | Visualización | Media | 2 | 2 | 8 |
| H7 | Comparación mensual | Visualización | Media | 5 | 2 | 9 |
| H9 | Detección de recurrencias | Asistente | Alta | 5 | 3 | 10 |
| H10 | Recomendaciones con IA | Asistente | Alta | 5 | 3 | 11 |
| H11 | Exportar historial | Resguardo | Media | 3 | 3 | 12 |

Margen de ajuste ante atrasos: **H7 y H8** (decisión formal del equipo, riesgo R7).
Los criterios de aceptación están en `feature_list.json` (campo `acceptance`).

## Fechas que mandan

| Hito | Fecha línea base (Etapa 2) | Fecha replanificada (Etapa 3) |
|---|---|---|
| Informe de Etapa 3 | 06/11/2026 | 06/11/2026 |
| Versión completa de la app | 07/11/2026 | 12/11/2026 (sin H7 y H8, postergadas por R7) |
| Prueba de usabilidad con 5 usuarios | 03/11 al 09/11/2026 | 11/11 y 12/11/2026 |
| Entrega final del documento único | 13/11/2026 | 13/11/2026 |
| Presentación oral | 18/11 o 25/11/2026 | 25/11/2026 |

## Metas que la app tiene que poder demostrar (Etapa 3)

| KPI | Meta | Dónde se mide |
|---|---|---|
| K1 Tiempo medio de carga | ≤ 15 s | Prueba de usabilidad |
| K2 Identificación de las 3 categorías principales | ≥ 80 % | Prueba de usabilidad |
| K3 Utilidad de las recomendaciones | ≥ 4 sobre 5 | Prueba de usabilidad |
| K4 Exhaustividad y precisión de recurrencias | ≥ 85 % | Pruebas automatizadas |
| K6 Criterios de aceptación cubiertos por pruebas | 100 % (historias alta) | `node tool/harness_check.mjs` |

Detalle en `docs/kpis.md`.
