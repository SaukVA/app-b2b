# Quickstart: validar el escritorio con base de datos configurable (002)

Guía de validación de extremo a extremo. Los detalles están en [contracts/desktop-bridge.md](contracts/desktop-bridge.md),
[contracts/embedded-backend.md](contracts/embedded-backend.md) y [data-model.md](data-model.md).

## 1. Requisitos previos

- Dependencias instaladas (`npm install`) y Docker para un MongoDB local: `docker compose up -d`.
- Para el escenario remoto: un MongoDB con TLS accesible desde el equipo (por ejemplo, un clúster `mongodb+srv://`
  de pruebas) y su cadena de conexión con usuario y contraseña.
- Empezar sin configuración previa: borrar `database.bin`, `session.bin` y `config.json` de la carpeta `userData`
  de la app (en Windows, `%APPDATA%\@app\desktop` en desarrollo).

```powershell
npm run dev --workspace=apps/client
npm run dev --workspace=apps/desktop
```

No hace falta arrancar `apps/server`: el escritorio lanza su propio backend.

## 2. Tests automáticos

```powershell
npm run lint
npm test --workspaces
```

## 3. Escenarios de escritorio

| # | Acción | Resultado esperado | Requisitos |
|---|---|---|---|
| 1 | Abrir la app sin configuración | Login con «Base de datos: sin configurar» y «Configurar base de datos» | FR-005, FR-007, US1-1 |
| 2 | Configurar `mongodb://localhost:27017/b2b_escritorio` › «Probar conexión» | «Conexión correcta» sin guardar nada (el login sigue «sin configurar» si se vuelve atrás) | FR-009, US1-2 |
| 3 | «Guardar» y entrar con `admin` / `admin` | Vuelve al login con «localhost:27017 · Conectado»; acceso como Administrador | FR-011, US1-3, US1-4 |
| 4 | Probar `mongodb://usuario:clave@servidor-remoto:27017/db` (sin TLS) | Rechazada: «Las bases de datos remotas exigen conexión cifrada…» | FR-016, US1-6 |
| 5 | Probar y guardar la cadena remota con TLS | Indicador con solo el host remoto (sin usuario ni contraseña) y «Conectado» | FR-002, FR-006, US2-3 |
| 6 | Abrir «Cambiar base de datos» con la remota guardada | La cadena actual aparece con la contraseña oculta (`••••••••`) | FR-013, US3-1 |
| 7 | Con «Mantener la sesión» y sesión iniciada, cerrar sesión, cambiar a otra base de datos y volver a la primera | Pide identificarse: la sesión anterior ya no vale | FR-012, US3-2 |
| 8 | `docker compose stop` con la base local guardada y reabrir el login | «Sin conexión»; «Entrar» muestra un error de conexión que no cuenta como intento | FR-005, FR-018, US2-2 |
| 9 | `docker compose start` y pulsar «Entrar» sin reiniciar la app | Entra con normalidad | FR-019 |
| 10 | Buscar la contraseña de la base de datos en la carpeta `userData` | No aparece en claro en ningún archivo | FR-014, SC-004 |
| 11 | Abrir el login en la web (`http://localhost:5173` en el navegador) | Sin indicador ni enlace de base de datos | FR-008, SC-006 |

## 4. Empaquetado

```powershell
npm run package --workspace=apps/desktop
```

Instalar el resultado, repetir los escenarios 1 a 3 con la app empaquetada y comprobar que el backend arranca sin
`apps/server` en desarrollo (research R12).
