# AGENTS.md — Mapa de navegación para agentes de IA

> Punto de entrada para **cualquier** agente que trabaje en este repositorio
> (Claude Code, Antigravity u otro). No es una biblia de reglas: es un **mapa**.
> Leé solo lo que necesites cuando lo necesites (divulgación progresiva).
> Las reglas duras están en `rules.md` y no se negocian.

## 0. Contexto en tres líneas

App multiplataforma **Mobile + Desktop** con enfoque **Mobile First** desarrollada en
**React Native (JavaScript)** —usando **Expo** (React Native + React Native Web / Electron /
Tauri para Desktop) y **React Native CLI** (`react-native-windows` / `react-native-macos`)—
para registrar gastos, verlos por categoría, detectar gastos recurrentes y recibir
recomendaciones de un modelo de lenguaje externo.
Datos **solo en el dispositivo** (SQLite local con `expo-sqlite`). Proyecto académico del
Grupo 3 (ITU, Técnicas laborales), cierre el **13/11/2026**. Detalle en `docs/product.md`.

## 1. Antes de empezar (obligatorio)

1. Ejecutá `./init.sh` (o `powershell -ExecutionPolicy Bypass -File ./init.ps1` en Windows). Si falla, **parás** y reportás.
2. Leé `progress/current.md`: en qué quedó la última sesión y **qué herramienta** la tenía.
3. Leé `feature_list.json`. Toda feature con `"sdd": true` pasa por SDD (`docs/specs.md`).
4. Leé `rules.md`.

## 2. Mapa del repositorio

| Archivo / carpeta | Qué contiene | Cuándo leerlo |
|---|---|---|
| `rules.md` | Reglas duras: proceso, arquitectura, privacidad, calidad, git | Siempre |
| `feature_list.json` | Historias H1..H12, criterios de aceptación y estado | Siempre, al empezar |
| `progress/current.md` | Estado vivo de la sesión | Siempre, al empezar |
| `progress/history.md` | Bitácora append-only | Si necesitás contexto histórico |
| `progress/traceability.md` | Matriz CA ↔ R ↔ test | Al cerrar una feature |
| `specs/<feature>/` | `requirements.md` + `design.md` + `tasks.md` | Antes de implementar |
| `specs/_template/` | Plantillas | Al redactar un spec |
| `docs/product.md` | Visión, alcance (Mobile + Desktop, Mobile First), límites, historias | Para entender el qué |
| `docs/architecture.md` | Capas, dependencias, diseño Mobile First y decisiones | Antes de diseñar o programar |
| `docs/data_model.md` | Esquema SQLite (`expo-sqlite`) y migraciones | Antes de tocar persistencia |
| `docs/conventions.md` | Estilo JavaScript/React Native, Mobile First, errores, pruebas | Antes de escribir código |
| `docs/specs.md` | Proceso SDD, EARS, puerta humana | Antes de redactar o leer un spec |
| `docs/verification.md` | Cómo demostrar que funciona | Antes de declarar algo terminado |
| `docs/privacy.md` | Ley 25.326 y reglas de datos | Si la feature toca datos o la IA |
| `docs/llm_assistant.md` | Contrato con el modelo de lenguaje y respuesta de reserva | Para H10 y afines |
| `docs/kpis.md` | Métricas K1..K9 y cómo se miden | Para pruebas y cierre |
| `docs/git_workflow.md` | Ramas, commits, PR | Antes de commitear |
| `docs/tools_setup.md` | Claude Code y Antigravity | Configuración inicial |
| `CHECKPOINTS.md` | Criterios de estado final correcto | Para autoevaluarte |
| `.claude/agents/` | Definición canónica de cada rol | Si orquestás o asumís un rol |
| `.agents/` | Reglas y workflows de Antigravity | Antigravity los carga solo |
| `.antigravity/` | Guía y prompts de rol para Antigravity | Si usás Antigravity |
| `src/`, `test/` | Código fuente (React Native / JS) y pruebas | Para implementar y verificar |

## 3. Flujo de trabajo (SDD)

```
pending → [spec_author] → spec_ready → ⏸ HUMANO → in_progress → [implementer → reviewer] → done
```

1. El leader elige la feature: primero una `in_progress` (sesión interrumpida), luego una
   `spec_ready`, luego la `pending` de menor `orden`.
2. `spec_author` escribe `specs/<name>/{requirements,design,tasks}.md` y marca `spec_ready`.
3. **Pausa.** Un integrante del equipo lee el spec y aprueba o pide cambios.
4. Aprobado → el leader pasa a `in_progress` y lanza `implementer`.
5. `implementer` ejecuta `tasks.md` en orden, marcando `[x]`, con pruebas etiquetadas.
6. `reviewer` verifica trazabilidad, tareas, arquitectura, privacidad y `./init.sh`.
7. APPROVED → el leader marca `done` y agrega la entrada en `progress/history.md`.

## 4. Roles (resumen)

| Rol | Hace | Nunca hace |
|---|---|---|
| leader | Elige, delega, controla estados, para en la puerta humana | Editar `src/` o `test/` |
| spec_author | Redacta el spec de una feature | Escribir código o pruebas |
| implementer | Programa y prueba según el spec aprobado | Inventar requisitos o autoaprobarse |
| reviewer | Aprueba o rechaza con evidencia | Editar código |

## 5. Cierre de sesión

1. `./init.sh` (o `./init.ps1`) en verde.
2. Estados correctos en `feature_list.json`.
3. Resumen de `progress/current.md` al final de `progress/history.md`; `current.md` vuelve
   a la plantilla.
4. Horas de la sesión en `progress/horas.csv`.
5. Sin archivos temporales, `console.log()` de depuración ni TODOs sin contexto.

## 6. Si te bloqueás

- Releé la sección relevante de `docs/`.
- Si falta información para un requisito, **no la inventes**: estado `blocked` y razón
  en `progress/current.md`.
- Si una herramienta no hace lo esperado, no improvises un workaround: documentalo y pará.
