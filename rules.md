# rules.md — Reglas duras del proyecto

> Fuente única de reglas para **Claude Code** (importado desde `CLAUDE.md`) y para
> **Antigravity** (resumido en `.agents/rules/00-reglas-duras.md`, que remite acá).
> Si una instrucción del chat contradice este archivo, gana este archivo y se avisa al humano.

## 1. Proceso

1. **Una sola feature a la vez.** Máximo una feature en `in_progress` en `feature_list.json`.
2. **Sin spec no hay código.** Toda feature `"sdd": true` tiene `requirements.md`,
   `design.md` y `tasks.md` aprobados antes de tocar `src/`.
3. **Puerta humana.** Solo un integrante del equipo puede aprobar un spec. La aprobación se
   registra en `progress/current.md` con nombre y fecha.
4. **Nadie se autoaprueba.** El implementer no marca `done`; el reviewer no edita código.
5. **Una herramienta por feature.** Si `progress/current.md` dice que la feature la tiene
   otra herramienta (Claude Code o Antigravity), no se toca.
6. **El estado vive en disco.** Resultados en archivos; en el chat solo referencias.
7. **El alcance es línea base.** Nada fuera de `docs/product.md` (límites de la Etapa 1).
   Si un requisito lo exige, la feature pasa a `blocked` y decide el equipo (riesgo R7).

## 2. Arquitectura y Multiplataforma (Mobile First + Desktop)

8. Capas `presentation → domain ← data`. El dominio (`src/domain/`) es **JavaScript puro**:
   no importa `react`, `react-native`, `expo-sqlite` ni clientes HTTP (`fetch`, `axios`).
   Ver `docs/architecture.md`.
9. **Tecnología y enfoque:** Aplicación en **React Native (JavaScript)** usando **Expo**
   (React Native + React Native Web / Electron / Tauri para Desktop) y **React Native CLI**
   (`react-native-windows` / `react-native-macos`). El desarrollo de toda interfaz es
   **Mobile First** y debe adaptarse de forma responsiva a pantallas **Desktop**.
10. Persistencia **solo** en SQLite local mediante `expo-sqlite`. Sin backend, sin nube, sin
    autenticación.
11. Todo cambio de esquema es una **migración versionada** en `src/data/db/` y se documenta
    en `docs/data_model.md`.
12. Los importes se guardan como **enteros en centavos** (`Number.isInteger(amountCents)`),
    nunca como decimales en coma flotante.
13. El acceso al modelo de lenguaje está aislado en `src/assistant/` detrás de una interfaz.
    Ningún otro módulo hace llamadas de red.
14. Dependencias nuevas en `package.json` solo si el `design.md` las justifica con una
    alternativa descartada.

## 3. Privacidad (Ley 25.326)

15. A la API del modelo solo viaja el **resumen agregado** definido en
    `docs/llm_assistant.md`: totales por categoría, variaciones y recurrencias. **Nunca**
    notas, subcategorías libres, nombres, fechas exactas de gastos individuales ni
    identificadores del dispositivo o del usuario.
16. Sin aceptar el aviso de privacidad (H12) no se accede a la app ni se llama a la API.
17. La clave de la API nunca se commitea: se inyecta por variable de entorno
    (`EXPO_PUBLIC_LLM_API_KEY` en `.env` local ignorado) y los archivos `.env`,
    `key.properties`, `*.jks` y `*.keystore` están en `.gitignore`.
18. Las recomendaciones siempre muestran la advertencia de carácter orientativo.

## 4. Calidad y verificación

19. **No se declara terminado sin `./init.sh` (o `./init.ps1`) en verde** (análisis estático y pruebas).
20. Cada requisito `R<n>` tiene al menos una prueba cuya descripción contiene la etiqueta
    `[H<id>-R<n>]` (por ejemplo `[H9-R1]`). `tool/harness_check.mjs` lo verifica.
21. Las pruebas no usan red: el cliente del modelo se reemplaza por un *fake* (`FakeLlmClient`).
22. Las pruebas de persistencia usan una base SQLite en memoria (o adaptador SQLite en
    memoria compatible con la interfaz de `AppDatabase` / `expo-sqlite`), no mocks ad-hoc
    que salteen las consultas SQL.
23. Sin `console.log()` de depuración, sin código comentado y sin TODO sin contexto.

## 5. Git

24. Una rama por feature: `feature/h09-deteccion-recurrencias`.
25. Commits en español con prefijo convencional: `feat(h9): ...`, `test(h9): ...`,
    `docs(spec): ...`.
26. Ningún agente hace `git push` ni fusiona a `main`: lo hace un integrante tras revisar.
