# Quickstart: Ajuste al nuevo diseño del menú y del login (008-design-alignment)

Guía para comprobar la feature de principio a fin. El contrato de la pantalla está en [contracts/navigation-ui.md](contracts/navigation-ui.md) y la referencia visual en `docs/design/`.

## 1. Requisitos previos

```powershell
npm install
docker compose up -d
npx playwright install chromium   # una vez por equipo
```

## 2. Tests automáticos

```powershell
npm test --workspace=apps/client
npm run test:e2e -- navigation smoke
npm run lint
```

Cobertura esperada:

- `NavBar`: sin marca; el elemento de plegar es el último de la lista inferior, con el texto «Plegar menú» / «Desplegar menú», `aria-expanded` y `title`.
- `AppNav`: pie en una fila con nombre y «rol · canal» con `title` completo, y botón «Cerrar sesión» por nombre accesible.
- `SettingsPage`: subtítulo nuevo.
- E2E:
  - sin «Venta a mayoristas» ni logotipo en ancho, plegado y estrecho;
  - plegar y desplegar con el nuevo elemento;
  - pie en estrecho reducido al botón;
  - login a 390 px sin panel y con el formulario centrado.

## 3. Comprobación manual (web)

```powershell
npm run dev --workspace=apps/server
npm run dev --workspace=apps/client
```

| # | Pasos | Resultado esperado |
|---|---|---|
| 3.1 | Abrir el login a 1440 px | Panel oscuro con titular y texto, sin logotipo ni «Venta a mayoristas» |
| 3.2 | Estrechar a 390 px | Sin panel oscuro; el formulario centrado en vertical y horizontal, visible entero sin desplazarse |
| 3.3 | Iniciar sesión a 1440 px | Menú sin marca: el primer elemento es el primer módulo del rol. Bajo Ajustes, «Plegar menú» en gris con doble chevrón |
| 3.4 | Mirar el pie | Una fila: avatar, nombre, «rol · Web» y el botón de cerrar sesión a la derecha |
| 3.5 | Usuario con nombre de 60 caracteres (crearlo en Ajustes › Usuarios) | El nombre se recorta con «…»; al pasar el ratón se ve completo |
| 3.6 | Pulsar «Plegar menú» | Menú de 72 px, solo iconos; el elemento dice «Desplegar menú» y su icono gira; en el pie solo el botón de cerrar sesión |
| 3.7 | Tabular hasta «Desplegar menú» y «Cerrar sesión» | Contorno naranja visible y etiqueta flotante con su nombre |
| 3.8 | Recargar | El menú sigue plegado (005) |
| 3.9 | Estrechar a 390 px | Barra superior sin marca ni elemento de plegar; al final, solo el botón de cerrar sesión |
| 3.10 | Pulsar cerrar sesión (ancho, plegado y estrecho) | Vuelve al login |
| 3.11 | Ajustes | Subtítulo «Preferencias de la aplicación y acceso de usuarios.» |
| 3.12 | Tema Oscuro | Menú, pie y login se ven igual que en claro |

## 4. Comprobación en escritorio

```powershell
npm run dev --workspace=apps/desktop
```

- Repetir 3.1–3.4 y 3.6: el pie dice «rol · Escritorio».
- En el login a 390 px, el indicador de base de datos y «Cambiar base de datos» siguen visibles.

## 5. Diseño

- `docs/design/README.md` y `docs/design/canvas/` incluyen la actualización del lienzo en el mismo PR (FR-014).
- Revisión visual frente a los tableros, en claro y oscuro, a 390 y 1440 px (SC-006).
