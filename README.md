# RepoDigital – Frontend

Interfaz web del **Sistema Semillero (RepoDigital)**: el repositorio de proyectos del instituto, donde los estudiantes registran y continúan proyectos, los docentes los revisan y el administrador gestiona usuarios, asignaciones y períodos.

- **Stack:** React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router 7, Zustand.
- **Backend:** [backend-repositorio-proyectos](https://github.com/jhos-vac/backend-repositorio-proyectos) (API en `/api`).
- **Despliegue (compose y scripts del servidor):** repositorio privado `semillero-deploy`.

## Desarrollo local

Requisitos: Node 20 o superior y el backend corriendo (por defecto en `http://localhost:8000`).

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Si el backend no está en `http://localhost:8000`, crea un archivo `.env` con:

   ```
   VITE_API_URL=http://host-del-backend:puerto
   ```

3. Inicia el servidor de desarrollo (por defecto en `http://localhost:5173`):

   ```bash
   npm run dev
   ```

El backend debe aceptar ese origen en CORS: fuera de producción ya permite `http://localhost:5173`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Compila para producción en `dist/`. |
| `npm run preview` | Sirve localmente lo compilado. |
| `npm run lint` | Revisa el código con ESLint. |

`npm run build` no revisa tipos. Para revisarlos:

```bash
npx tsc -b
```

## `VITE_API_URL` se fija al compilar

Vite incrusta la URL de la API en el código durante el build. Si cambia la IP o el puerto del backend, **hay que volver a compilar** el frontend; cambiar una variable del servidor no basta. En Docker se pasa como argumento de build (`VITE_API_URL`).

## Producción

La imagen Docker (`Dockerfile`) compila con Node y sirve `dist/` con nginx. `nginx.conf` redirige cualquier ruta a `index.html` para que funcione el enrutado del lado del cliente.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/pages` | Páginas (proyectos, revisión, perfil, login); `admin/` y `student/` por rol. |
| `src/components` | Componentes: `layout/` (barra lateral, guardias de rutas), `projects/`, `common/` y `ui/` (base shadcn). |
| `src/api/axios.ts` | Cliente HTTP: añade el token, renueva la sesión ante un 401 y lleva al perfil si el servidor exige cambiar la clave. |
| `src/store` | Estado global con Zustand (sesión, período seleccionado, tema). |
| `docs/GUIA-ESTILOS.md` | Guía de estilos de la interfaz. |

## Rutas protegidas

- `ProtectedRoute`: exige sesión; con clave temporal solo deja entrar al perfil.
- `GuestRoute`: login y registro; con sesión abierta lleva al panel.
- `RoleRoute`: restringe por rol (`ADMIN`, `TEACHER`, `USER`).

Son solo para la navegación: el backend valida los permisos en cada petición.

## Flujo de trabajo (Gitflow)

- `main`: lo que está en producción. **Cada push a `main` se despliega solo** en el servidor (runner autoalojado).
- `develop`: integración.
- `feature/<nombre>`: se crea desde `develop` y vuelve a `develop` con un PR.
- Publicar = PR de `develop` a `main`.

La CI (`.github/workflows/ci-cd.yml`) compila en cada push a `develop`, `feature/**`, `release/**`, `hotfix/**` y en los PR.
