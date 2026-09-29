# Guía de estilos – RepoDigital / Semillero

## Color de marca
Todo el azul sale de las variables `--brand-*` en `src/index.css`. Para adoptar el azul exacto
del sistema de titulación basta con cambiar esos 9 valores; ningún componente tiene el azul escrito a mano.

| Token | Uso |
| --- | --- |
| `brand-700` | Botón principal, enlaces, elemento activo |
| `brand-900` | Menú lateral y panel de acceso |
| `brand-600` | Hover, barras de progreso, foco |
| `brand-100` / `brand-50` | Fondos suaves, etiquetas |

El azul se reserva para acciones y navegación. Los estados de proyecto tienen sus propios colores
(`src/lib/status.ts`): por iniciar (violeta), en progreso (verde), completado (gris).

## Estructura
- `components/layout/`: `AppLayout` (menú + barra superior), `Topbar`, `ProtectedRoute`, `AuthLayout`.
- `components/common/`: `StatCard`, `StatusBadge`, `InitialsAvatar`, `ProgressBar`, `EmptyState`.
- `store/periodStore.ts`: período académico elegido en la barra superior (filtra Inicio y Proyectos).
- Rutas internas cuelgan de `ProtectedRoute` + `AppLayout` en `App.tsx`; no incluyas `Sidebar` en las páginas.

## Reglas
- Fondo de página `bg-background`; tarjetas `bg-white` con `border-slate-200`.
- Texto: `text-slate-900` (títulos), `text-slate-500` (apoyo). Texto blanco solo sobre fondos sólidos.
- Tamaños: 12, 14, 16, 20 y 28–30 px.
