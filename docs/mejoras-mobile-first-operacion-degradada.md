# Mejoras — Mobile-first y operación degradada en el registro de avance

## Alcance

Ajuste del principio "Mobile-first y operación degradada" (`docs/propuesta-mejoras-srm-ticketing-crm-tms.md`, sección 2) aplicado a la pantalla más usada en campo por el Operador: el registro de avance (`src/components/organisms/operator-progress-form.tsx`), donde se documentan las fotos y los materiales de la atención.

Alcance acordado: **degradación elegante, sin Service Worker ni PWA completa**. Esa iniciativa transversal sigue registrada como ítem separado (P2, Etapa 3) en la propuesta de mejoras.

## Cambios visibles para el Operador

**Borrador persistente por solicitud**
Los campos del formulario (horas, avance, estado, narrativa, materiales) se guardan automáticamente en el dispositivo mientras se completan. Si el operador pierde la señal, cierra la pestaña por error o recarga la página, al reabrir la misma solicitud aparece un aviso "Se restauró un borrador guardado en este dispositivo" con los valores tal como quedaron, y un botón para descartarlo. La solicitud que estaba abierta también se reabre sola tras un refresh accidental.

**Selector de fotos con preview y reintento por archivo**
Cada foto o documento seleccionado se muestra en una grilla con miniatura (o ícono para PDF), una barra "n de m listas" y un estado individual: Pendiente, Subiendo…, Lista o Error. Un archivo demasiado grande (>10 MB) o de tipo no permitido se marca en rojo de inmediato, sin esperar a que falle la subida. Si la señal se corta a mitad de una subida múltiple, las fotos que ya llegaron a "Lista" no se pierden ni se vuelven a subir — solo se reintenta la que falló, con un botón dedicado.

**Indicador de conectividad**
Una barra amarilla fija en la parte superior avisa "Sin conexión — los cambios se guardan localmente" cuando el dispositivo pierde la señal. El botón "Guardar avance" se deshabilita con un mensaje explicando la causa (sin conexión, fotos aún subiendo, o vehículo sin definir en el control de ruta).

**Confirmación de guardado**
Al registrar un avance exitosamente aparece una notificación toast ("Avance registrado correctamente."), antes inexistente.

**Footer de acciones fijo en móvil**
Los botones "Cancelar" y "Guardar avance" quedan fijos (sticky) al pie de la pantalla mientras se completa el formulario, evitando que el operador tenga que hacer scroll hasta el final en formularios largos con el teclado del teléfono abierto.

## Cambios técnicos

**Archivos nuevos**

| Archivo | Propósito |
|---|---|
| `src/hooks/use-network-status.ts` | Detección de conectividad (`navigator.onLine` + eventos `online`/`offline`) |
| `src/lib/local-storage-draft.ts` | Wrapper tolerante a fallos sobre `localStorage` |
| `src/features/operador/lib/adjuntos.ts` | Validación de tipo/tamaño de archivo antes de subir |
| `src/features/operador/hooks/use-avance-draft.ts` | Borrador persistente por solicitud + registro de "última solicitud abierta" |
| `src/features/operador/hooks/use-attachment-uploads.ts` | Máquina de estados por archivo, subida secuencial con reintento parcial |
| `src/components/atoms/progress.tsx` | Barra de progreso |
| `src/components/molecules/connectivity-banner.tsx` | Banner de "sin conexión" |
| `src/components/molecules/photo-attachment-picker.tsx` | Selector de fotos con preview, progreso y reintento |

**Archivos modificados**: `operator-progress-form.tsx`, `use-operador.ts` (ya no toca `supabase.storage` directamente, solo invoca la Edge Function con los adjuntos ya subidos), `operador.types.ts`, `operador-page.tsx`, `src/lib/i18n.ts` (claves nuevas en español e inglés).

**Decisiones de diseño relevantes**

- La subida de adjuntos se separó del registro del avance: el hook `useAttachmentUploads` nunca vuelve a subir un archivo ya marcado "listo", incluso si el envío del formulario falla o se reintenta. Esto es seguro porque la función `registrar_avance_operador` (`supabase/migrations/20260811100000_registro_avance_operador.sql`) es una única transacción — cualquier error revierte automáticamente todo lo insertado en ese intento, sin dejar rastro parcial.
- No se reimplementó la subida con `XMLHttpRequest` para tener progreso en bytes real, porque el SDK de Supabase no lo expone de forma nativa; se prefirió un estado discreto por archivo (suficiente mejora sobre el estado anterior, que no daba ningún feedback).
- El borrador excluye los objetos `File` (no son serializables en `localStorage` sin arriesgar la cuota del origen); solo se guarda un contador de fotos pendientes, con aviso al operador de que debe volver a adjuntarlas si se perdieron.

## Límites conocidos (no implementados a propósito)

- **Archivos huérfanos en Storage**: si el operador cierra la pestaña a mitad de una subida sin usar "Cancelar", esa foto puede quedar en el bucket sin un avance asociado. Requeriría un job de reconciliación en el backend (fuera de este alcance).
- **Sin cola offline con reintento automático**: el envío queda bloqueado mientras no haya conexión; no se reintenta solo en segundo plano al recuperar la señal. Esa capacidad, junto con Service Worker/PWA completa, sigue como iniciativa separada en `docs/propuesta-mejoras-srm-ticketing-crm-tms.md`.
