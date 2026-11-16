# Reglas de programación – Frontend

Reglas para trabajar en equipo en el frontend de RepoDigital (Semillero). Si una regla no encaja con tu caso, coméntalo en el PR antes de saltártela.

## 1. Flujo de trabajo (gitflow)

- **Nunca hagas commit ni push directo a `main` ni a `develop`.** Cada push a `main` se despliega solo en el servidor.
- Cada card del tablero de Notion tiene su rama `feature/<código>-<tarea>` ya creada desde `develop` (el nombre está en la propiedad **Rama** de la card). Trabaja solo en la rama de tu card.
- Antes de empezar, y cada vez que retomes:

  ```bash
  git fetch origin
  git switch feature/fe-03-boton-completado
  git merge origin/develop
  ```

- Una card = una rama = un PR hacia `develop`. Si la tarea es grande, divídela en PR más pequeños.
- Los conflictos se resuelven en tu rama (mergeando `develop` en ella), nunca en `develop`.
- Si tu card depende de una de backend (propiedad **Depende de**), no publiques el frontend antes que el backend.
- **Release:** un PR de `develop` a `main`, que hace el responsable del despliegue.
- **Urgencias en producción:** rama `hotfix/<tarea>` desde `main`, con PR a `main` y luego a `develop`.
- Después del merge, borra la rama (GitHub ofrece el botón en el PR).

## 2. Commits

- En español, en presente y con prefijo: `frontend:`, `docs:` o `ci:`.
  Ejemplo: `frontend: botón para marcar un proyecto como completado`
- Primera línea de 72 caracteres como máximo; en el cuerpo explica **por qué** se hizo el cambio.
- Un commit = un cambio coherente. No mezcles cambios de formato con cambios de lógica.
- **Nunca subas** `.env`, secretos, `node_modules/` ni `dist/`.

## 3. Pull requests

- Base: `develop`. Título como el commit principal.
- Descripción con:
  - la card (código y enlace de Notion);
  - qué cambia y por qué;
  - cómo lo probaste;
  - **capturas** de la pantalla en modo claro y oscuro si cambia la interfaz.
- **CI en verde obligatorio** (revisión de tipos y build) y **al menos una revisión** de otra persona antes de mergear. No mergees tu propio PR sin revisión.
- Actualiza la card en Notion: **En progreso** al empezar, el enlace del PR al abrirlo, y **Hecho** cuando llegue a producción.

## 4. Estilo de código

- TypeScript estricto (`strict`, `noUnusedLocals`, `noUnusedParameters`): la CI rechaza el PR si `tsc` da errores.
- Nombres de variables, funciones y componentes en **inglés**; textos de la interfaz y comentarios en **español**.
- Comentarios para explicar el **porqué**. Nada de código comentado ni `console.log` de depuración.
- Lint antes del PR:

  ```bash
  npm run lint
  ```

## 5. Estructura

- `src/pages/`: pantallas (una por ruta); `admin/` y `student/` según el rol.
- `src/components/`: componentes por dominio (`projects/`, `layout/`, `common/`) y `ui/` para los componentes base (shadcn).
- Un componente por archivo. Si una pantalla crece, saca partes a componentes: **no agrandes `ProyectPage.tsx`**, que ya tiene más de 1 000 líneas.
- `src/store/` (Zustand) solo para estado global: sesión, período elegido y tema. El resto, estado local del componente.
- `src/lib/`: utilidades y hooks compartidos (por ejemplo `useLogout`, `useRole`, `status.ts`).

## 6. Datos y API

- Llama a la API **solo con `api`** de `src/api/axios.ts`. Ese cliente agrega el token, renueva la sesión y maneja el cambio de clave obligatorio. **No uses `fetch` directo.**
- Los listados piden **páginas al servidor** con los filtros como parámetros. Nunca pidas `limit` enormes para filtrar en el navegador.
- Las búsquedas mientras se escribe llevan retardo (unos 350 ms) y descartan respuestas viejas (ver `fetchProjects` en `ProyectPage.tsx`).
- Los formularios usan `react-hook-form` + `zod`, con mensajes en español.

## 7. Rutas y permisos

- Las pantallas internas van dentro de `ProtectedRoute`; las restringidas por rol, dentro de `RoleRoute` (`ADMIN`, `TEACHER`, `USER`).
- Ocultar un botón no es seguridad: el backend valida cada petición. El frontend solo evita mostrar lo que no corresponde.

## 8. Estilos y accesibilidad

- Tailwind + los componentes de `src/components/ui/`.
- El color de marca **solo con las clases `brand-*`** (variables `--brand-*` de `src/index.css`). No escribas colores hexadecimales en los componentes.
- Si usas un color semántico (`amber`, `red`, `emerald`…), revisa el **modo oscuro**; si se ve mal, agrega su ajuste en el bloque `.dark` de `src/index.css`.
- Sigue `docs/GUIA-ESTILOS.md`.
- Botones con texto o `aria-label`, imágenes con `alt` y contraste legible en ambos temas.

## 9. Pruebas antes del PR

1. Revisión de tipos sin errores (lo revisa la CI):

   ```bash
   npx tsc -b
   ```

2. `npm run build` sin errores.
3. Probar en el navegador con los 3 roles (ADMIN, TEACHER, USER) y sin sesión.
4. Revisar modo claro y oscuro.
5. Revisar a 375 px de ancho (móvil).
6. Las pruebas propias de la card (sección **Pruebas que debe pasar** en Notion).
