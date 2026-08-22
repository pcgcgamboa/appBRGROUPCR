# Sistema de Diseño — Sistema de Solicitudes de Servicio

Este documento describe el estado vigente del frontend y el sistema de diseño aplicado en la modernización de UI/UX del proyecto. Es la referencia funcional para arquitectura visual, navegación, tokens de color, tipografía, espaciado, breakpoints, motion y componentes compartidos. Ante una discrepancia, el código es la fuente de verdad: `src/styles/globals.css` para variables CSS, `tailwind.config.ts` para su exposición como utilidades y `src/components/atoms` para la API de los primitivos.

**Estado de esta referencia:** actualizado el 16 de agosto de 2026 contra la implementación local. Todo valor de contraste listado aquí fue verificado contra WCAG 2.1 AA con la fórmula de contraste relativo (no estimado a ojo).

## 1. Paleta de color

Formato: HSL sin `hsl()` (consistente con el formato actual de `globals.css`, para usar como `hsl(var(--token))` en Tailwind). Se mantiene `--primary` (`215 75% 36%`) como base porque ya es el azul corporativo usado hoy y es coherente con el logo del login; el resto de la paleta se construye a partir de ese tono.

| Token                      | Valor HSL                     | Rol                                | Uso                                                                                                                                 |
| -------------------------- | ----------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `--background`             | `210 40% 98%`                 | Superficie base                    | Fondo de página                                                                                                                     |
| `--foreground`             | `222.2 47.4% 11.2%`           | Texto principal                    | Texto sobre `background`/`card`                                                                                                     |
| `--card`                   | `0 0% 100%`                   | Superficie elevada                 | Tarjetas, paneles, filas de tabla                                                                                                   |
| `--card-foreground`        | `222.2 47.4% 11.2%`           | Texto sobre `card`                 | —                                                                                                                                   |
| `--popover`                | `0 0% 100%`                   | Superficie flotante                | Dialog, Dropdown, Popover, Tooltip                                                                                                  |
| `--popover-foreground`     | `222.2 47.4% 11.2%`           | Texto sobre `popover`              | —                                                                                                                                   |
| `--primary`                | `215 75% 36%`                 | Marca / acción principal           | Botón primario, enlaces activos, foco                                                                                               |
| `--primary-foreground`     | `210 40% 98%`                 | Texto sobre `primary`              | —                                                                                                                                   |
| `--secondary`              | `215 25% 94%`                 | Acción secundaria                  | Botón secundario, fondos sutiles de sección                                                                                         |
| `--secondary-foreground`   | `222.2 47.4% 11.2%`           | Texto sobre `secondary`            | —                                                                                                                                   |
| `--muted`                  | `210 40% 96.1%`               | Superficie neutra                  | Fondo de header de tabla, zonas deshabilitadas                                                                                      |
| `--muted-foreground`       | `215 19% 40%`                 | Texto secundario                   | Ayudas, metadatos, `text-xs`                                                                                                        |
| `--accent`                 | `205 90% 94%`                 | Resalte sutil                      | Hover de fila/ítem de menú, fondo de selección                                                                                      |
| `--accent-foreground`      | `215 75% 28%`                 | Texto sobre `accent`               | —                                                                                                                                   |
| `--destructive`            | `0 72% 42%`                   | Estado de error / acción peligrosa | Botón eliminar, mensajes de error, badge vencido                                                                                    |
| `--destructive-foreground` | `0 0% 100%`                   | Texto sobre `destructive`          | —                                                                                                                                   |
| `--success`                | `142 71% 30%`                 | Estado de éxito                    | Confirmaciones, badge "al día"                                                                                                      |
| `--success-foreground`     | `0 0% 100%`                   | Texto sobre `success`              | —                                                                                                                                   |
| `--warning`                | `28 95% 32%`                  | Estado de advertencia              | Badge "por vencer", alertas de SLA                                                                                                  |
| `--warning-foreground`     | `0 0% 100%`                   | Texto sobre `warning`              | —                                                                                                                                   |
| `--border`                 | `214.3 31.8% 91.4%`           | Borde decorativo                   | Divisores, bordes de tarjeta (siempre acompañado de `shadow-sm`, no es el único indicador)                                          |
| `--input`                  | `215 20% 58%`                 | Borde funcional                    | Borde de `input`/`select`/`textarea`/`checkbox` — necesita ≥3:1 (WCAG 1.4.11) por ser el único indicador de los límites del control |
| `--ring`                   | `215 75% 36%` (= `--primary`) | Foco                               | `focus-visible:ring-*` en todos los controles interactivos                                                                          |
| `--radius`                 | `0.75rem`                     | Radio de borde                     | Sin cambios                                                                                                                         |

### Verificación de contraste (WCAG 2.1 AA — 4.5:1 texto normal, 3:1 texto grande/elementos UI)

| Par                                      | Ratio   | Resultado                                                                                                                                                                                                  |
| ---------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `foreground` / `background`              | 17.04:1 | ✅                                                                                                                                                                                                         |
| `foreground` / `card`                    | 17.84:1 | ✅                                                                                                                                                                                                         |
| `primary-foreground` / `primary`         | 7.41:1  | ✅                                                                                                                                                                                                         |
| `secondary-foreground` / `secondary`     | 15.48:1 | ✅                                                                                                                                                                                                         |
| `muted-foreground` / `background`        | 5.87:1  | ✅ (el valor actual daba 4.54:1, aprobado pero sin margen; se ajustó a `215 19% 40%` para tener margen seguro en `text-xs`)                                                                                |
| `accent-foreground` / `accent`           | 9.08:1  | ✅                                                                                                                                                                                                         |
| `destructive-foreground` / `destructive` | 6.47:1  | ✅                                                                                                                                                                                                         |
| `success-foreground` / `success`         | 4.84:1  | ✅                                                                                                                                                                                                         |
| `warning-foreground` / `warning`         | 5.96:1  | ✅ (el primer valor probado, `30 92% 38%`, daba 4.38:1 y **fallaba** — se oscureció a `28 95% 32%`)                                                                                                        |
| `input` (borde) / `background`           | 3.10:1  | ✅ cumple el umbral de 3:1 para límites de UI                                                                                                                                                              |
| `border` (decorativo) / `background`     | 1.18:1  | Intencional — es un divisor decorativo, no el único portador de información (siempre con `shadow-sm` como refuerzo visual); **no se usa como borde de `input`**, para eso existe el token `input` separado |

**Variantes "soft" para badges/estado** (fondo tenue + texto saturado del mismo tono, más legible en celdas de tabla que un fill sólido): `success-soft` fondo `142 71% 94%` / texto `142 75% 22%` (6.87:1), `warning-soft` fondo `38 92% 90%` / texto `28 95% 28%` (6.21:1), `destructive-soft` fondo `0 86% 95%` / texto `0 72% 38%` (6.34:1), `primary-soft` fondo `215 90% 95%` / texto `215 75% 32%` (7.84:1). Estas combinaciones ya se exponen desde Tailwind y son la opción estándar para badges y mensajes de estado.

## 2. Tipografía

**Decisión sobre Inter:** se carga vía `@fontsource/inter` (self-hosted, sin llamada a red externa en cada carga de página — más apto para una app interna que puede usarse en campo con conectividad variable) en vez de Google Fonts CDN. Alternativa descartada: quitar la declaración de Inter y aceptar la pila de fuentes de sistema — se descarta porque Inter ya está en el `font-family` declarado y su ausencia real es la inconsistencia a corregir, no el objetivo.

**Escala responsiva** (vía `clamp()`, para no requerir tocar ninguna clase `text-*` existente en los ~60 archivos — se sobreescribe `theme.extend.fontSize` en `tailwind.config.ts`, y las clases `text-xs` … `text-4xl` ya usadas en todo el código heredan la nueva escala automáticamente):

| Clase Tailwind | `clamp()`                                     | Uso típico                    |
| -------------- | --------------------------------------------- | ----------------------------- |
| `text-xs`      | `clamp(0.75rem, 0.72rem + 0.1vw, 0.8125rem)`  | Metadatos, ayudas, badges     |
| `text-sm`      | `clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem)` | Cuerpo de tabla, labels       |
| `text-base`    | `clamp(0.9375rem, 0.9rem + 0.15vw, 1rem)`     | Cuerpo de texto general       |
| `text-lg`      | `clamp(1.0625rem, 1rem + 0.25vw, 1.125rem)`   | Subtítulos, texto destacado   |
| `text-xl`      | `clamp(1.15rem, 1.05rem + 0.4vw, 1.25rem)`    | Encabezado de sección (h3)    |
| `text-2xl`     | `clamp(1.375rem, 1.2rem + 0.7vw, 1.5rem)`     | Encabezado de página (h2)     |
| `text-3xl`     | `clamp(1.625rem, 1.3rem + 1.2vw, 1.875rem)`   | Título de página (h1 interno) |
| `text-4xl`     | `clamp(1.875rem, 1.4rem + 2vw, 2.5rem)`       | Hero de login                 |

Pesos: se mantienen los ya usados en el código (`font-medium` 500, `font-semibold` 600, `font-bold` 700) — no requieren cambio.

## 3. Espaciado

La escala default de Tailwind (múltiplos de `0.25rem`/4px) ya cumple el requerimiento de "escala de 4/8px" y es la que usa hoy todo el código. **No se extiende** — extenderla sin necesidad agregaría un token más para mantener sin beneficio real, dado que el 100% del espaciado actual ya es consistente con esa escala.

## 4. Breakpoints (mobile-first)

Se usan los breakpoints default de Tailwind, ya adoptados en 36 archivos del proyecto — no se personalizan:

| Breakpoint | Ancho  | Gobierna                                                           |
| ---------- | ------ | ------------------------------------------------------------------ |
| (base)     | 0px    | Layout de una columna y navegación administrativa mediante drawer  |
| `sm`       | 640px  | Formularios pasan de 1 a 2 columnas (`sm:grid-cols-2`)             |
| `md`       | 768px  | Grillas de tarjetas/KPI pasan a 2 columnas                         |
| `lg`       | 1024px | Sidebar admin fijo, layout split del login, grillas a 3-4 columnas |
| `xl`       | 1280px | Grillas de reportes a 4 columnas                                   |

## 5. Motion

- **Duración:** 150ms para micro-interacciones (hover, focus, cambio de color/sombra), 300ms para el cambio de ancho del sidebar y los valores de `tailwindcss-animate` para entrada/salida de overlays (Dialog, Sheet, Dropdown).
- **Easing:** `ease-out` para entradas, `ease-in` para salidas — evita el efecto "rebote" que no aporta a una app de uso profesional/repetitivo.
- **`prefers-reduced-motion`:** regla global en `globals.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
  Esto neutraliza automáticamente tanto las transiciones Tailwind existentes (`hover:-translate-y-0.5`, colapso de sidebar) como las animaciones de entrada/salida de los primitivos Radix, sin necesitar `motion-reduce:` en cada componente.

## 6. Especificación de componentes clave

**Botón** (`atoms/button.tsx`): variantes `default` (primary), `secondary`, `outline` (existente), `destructive`, `ghost`, `link`; tamaños `sm` (h-9), `default` (h-11, actual), `lg` (h-12), `icon` (size-11, cuadrado, para botones solo-ícono como editar/eliminar en tablas — hoy usan `h-9 px-3` ad-hoc). Estados: `hover` (existente: elevación + sombra en `default`), `focus-visible:ring-2 ring-ring ring-offset-2` (existente, se mantiene), `active:translate-y-0` (cancela la elevación de hover al presionar), `disabled:opacity-50 disabled:pointer-events-none` (existente).

**Input/Select/Textarea**: borde `border-input` para cumplir 3:1, `focus-visible:ring-2 ring-ring`, `disabled:bg-muted disabled:opacity-60` y mensaje de error asociado vía `aria-describedby`, centralizado mediante `molecules/form-field.tsx` cuando sea posible.

**Tarjeta** (`atoms/card.tsx`): expone `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` y `CardFooter`. La base es `bg-card text-card-foreground rounded-lg border shadow-sm`. El primitivo está disponible, aunque todavía convive con composiciones equivalentes escritas directamente en componentes existentes; las pantallas nuevas deben preferirlo cuando su estructura encaje.

**Tabla**: encabezado `bg-muted text-muted-foreground font-semibold`, filas `border-t hover:bg-accent/50`, estados de carga con `Skeleton` (filas fantasma), estado vacío con mensaje + ícono y contenedor `overflow-x-auto` para tablas densas. La adopción es incremental: varias vistas ya usan `Skeleton`, pero no existe todavía un átomo `Table` único.

**Modal (Dialog)**: overlay `bg-foreground/40 backdrop-blur-sm`, contenido `bg-popover rounded-lg shadow-xl`, `role="dialog" aria-modal="true"`, foco atrapado y devuelto al trigger al cerrar (gratis vía Radix), cierre con `Esc` y click en overlay.

**Navegación**: ítem activo con `bg-primary text-primary-foreground` mediante `variant="default"` y `aria-current="page"`; el color no es el único indicador (WCAG 1.4.1).

## 7. Decisiones subjetivas — alternativas consideradas

**Tablas en móvil** (hallazgo #10): 3 alternativas evaluadas:

1. **Mantener `overflow-x-auto` + `min-w-[Npx]`** (actual) — más barato, funcional, pero exige scroll lateral.
2. **Colapsar a tarjetas apiladas en móvil** (cada fila → una tarjeta con pares label/valor) — mejor UX táctil, pero requiere una vista alterna por tabla (mayor esfuerzo, uno por cada una de las ~8 tablas).
3. **Híbrido: mantener scroll horizontal en catálogos admin (uso mayormente desktop) y colapsar a tarjetas solo en `bandeja-encargado-page.tsx`** (la tabla más usada en campo/tablet).
   **Recomendado: opción 3** — concentra el esfuerzo donde más se usa desde móvil, sin rehacer las 8 tablas.

**Navegación admin en móvil** (hallazgo #6): 3 alternativas:

1. Bottom navigation bar (común en apps móviles, pero solo caben ~5 ítems y el admin tiene 12 secciones).
2. **Drawer lateral con trigger hamburguesa** (Dialog de Radix, reutiliza el primitivo ya planeado) — recomendado, escala a cualquier cantidad de secciones.
3. Mantener la fila scrolleable actual — se descarta por ser el hallazgo a resolver.
   **Decisión adoptada: opción 2.** `AdminShell` ya implementa el drawer con `Sheet`.

## 8. Arquitectura vigente del frontend

La aplicación es una SPA de React 18 y TypeScript construida con Vite. No usa un router de cliente: `HomePage` decide la experiencia según la sesión y el rol activo; la excepción pública `/bolsa-empleo` se detecta directamente desde `window.location.pathname`.

La composición se divide por responsabilidad:

- `src/app`: raíz de la aplicación y proveedores globales.
- `src/components/atoms`: primitivos visuales reutilizables, en su mayoría construidos sobre Radix UI.
- `src/components/molecules`: combinaciones pequeñas como encabezados, métricas, campos, paginación y controles de cuenta.
- `src/components/organisms`: formularios y módulos de negocio completos.
- `src/components/pages`: composición de vistas por rol o área funcional.
- `src/components/templates`: shells que definen estructura, navegación y zonas persistentes.
- `src/features`: tipos, esquemas y hooks de datos por dominio. La obtención y mutación de datos se mantiene fuera de los componentes visuales siempre que sea posible.
- `src/stores/ui.store.ts`: preferencias locales de interfaz con Zustand; persiste idioma y estado colapsado del menú bajo la clave `control-solicitudes-ui`.

`AppProviders` instala TanStack Query (30 segundos de `staleTime`, un reintento) y el proveedor global de tooltips (300 ms de demora). `App` monta además el `Toaster` de Sonner. Inter se sirve localmente en pesos 400, 500, 600 y 700.

## 9. Estructura visual y navegación

`AppShell` es el marco común para experiencias públicas y autenticadas:

- header fijo de 64 px con identidad de marca dinámica, selector de idioma y menú de cuenta;
- enlace de salto al contenido como primera acción de teclado;
- contenido centrado mediante `container`, con padding vertical responsivo;
- fondo con gradiente radial sutil y superficies translúcidas en el header;
- favicon e imágenes de marca obtenidos desde la configuración de marca.

`AdminShell` se usa dentro de la experiencia de administración:

- en móvil muestra un `Sheet` lateral activado por un botón de menú;
- desde `lg` muestra un sidebar fijo de 240 px, reducible a 72 px;
- el estado colapsado persiste entre sesiones;
- agrupa solicitudes, rutas, notificaciones, reportes, clientes, materiales, vehículos, usuarios y proveedores, además de configuración (tipos, roles y marca);
- todos los destinos activos declaran `aria-current="page"`.

La selección principal de experiencia depende de los roles `administrador`, `encargado`, `solicitante`, `operador` y `cliente`. Si una persona posee varios roles, `SessionToolbar` permite cambiar el rol activo durante la sesión. Administrador navega mediante sidebar; encargado y cliente usan `Tabs` para subsecciones; los demás roles presentan flujos enfocados en sus tareas.

El login usa una composición dividida desde `lg`: panel corporativo azul y tarjeta de acceso. En pantallas menores se oculta el panel promocional, se conserva el logo en la tarjeta y se mantiene el acceso público a la bolsa de empleo.

## 10. Componentes y dependencias visuales

Los componentes base siguen el estilo de shadcn/ui, pero son locales y se importan desde `@/components/atoms`; no deben importarse desde una biblioteca de componentes externa. Las dependencias principales son:

- Radix UI para foco, teclado y semántica de overlays, menús, tabs, switches, checkboxes, radios y tooltips.
- `class-variance-authority` y `cn()` para variantes y composición de clases.
- Lucide React para iconografía; los iconos decorativos deben usar `aria-hidden` implícito o no aportar texto alternativo redundante, y los botones de solo icono necesitan `aria-label`.
- Recharts para gráficos, React Leaflet para mapas y Sonner para notificaciones transitorias.
- `tailwindcss-animate` para estados de entrada y salida de componentes Radix.

Primitivos disponibles: `AlertDialog`, `Badge`, `Button`, `Card`, `Checkbox`, `Dialog`, `DropdownMenu`, `Input`, `Popover`, `RadioGroup`, `Select`, `Sheet`, `Skeleton`, `Sonner`, `Switch`, `Tabs`, `Textarea` y `Tooltip`. Antes de crear controles equivalentes, se debe revisar y extender esta capa.

## 11. Reglas para nuevas interfaces

1. Usar tokens semánticos (`bg-card`, `text-muted-foreground`, `border-input`) en lugar de colores Tailwind literales. Los colores literales se reservan para composiciones de marca deliberadas, como el hero del login.
2. Diseñar mobile-first. Los formularios comienzan en una columna; `sm` suele habilitar dos columnas, `md` las grillas de contenido y `lg` los layouts de navegación o panel dividido.
3. Mantener un objetivo táctil de al menos 44 px para acciones primarias y botones de icono (`min-h-11`/`size-11`). Los controles compactos `sm` se reservan para contextos densos.
4. Proveer estados de carga, vacío, error y éxito. Para carga estructural usar `Skeleton`; para acciones asíncronas conservar el botón, deshabilitarlo y mostrar progreso; para confirmación transitoria usar Sonner.
5. Asociar errores de formulario con `aria-describedby`, usar `role="alert"` cuando corresponda y no comunicar estados únicamente mediante color.
6. Usar `Dialog` para tareas acotadas, `AlertDialog` para acciones destructivas y `Sheet` para navegación móvil. No implementar overlays manuales.
7. En tablas densas, conservar `overflow-x-auto`; priorizar una representación en tarjetas cuando la tarea sea frecuente en campo y la lectura horizontal dificulte la operación.
8. Respetar `prefers-reduced-motion`. Las animaciones deben reforzar causalidad o jerarquía, no ser decorativas.
9. Mantener el contenido traducible mediante `useI18n`; evitar nuevas cadenas visibles hardcodeadas cuando exista o deba existir una clave de traducción.

## 12. Límites y deuda conocida

- La navegación no está respaldada por un router: los módulos por rol viven en estado local y no generan URLs profundas compartibles.
- La adopción de `Card` y de los tokens semánticos aún no es total; permanecen composiciones locales válidas que conviene migrar al modificarlas.
- No existe un primitivo compartido para tablas, por lo que encabezados, filas, vacíos y responsive pueden variar entre módulos.
- Algunos textos visibles todavía están escritos directamente en español. Al intervenir esas vistas se deben mover a `src/lib/i18n.ts`.
- La estrategia móvil de tablas es híbrida y debe decidirse según el contexto de uso, no aplicarse mecánicamente a todas las vistas.
