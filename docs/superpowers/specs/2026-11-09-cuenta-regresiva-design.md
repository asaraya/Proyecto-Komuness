# UI65 — Cuenta regresiva en la página principal

Fecha: 2026-11-09 · Estado: diseño aprobado en chat, pendiente de revisión escrita

## Objetivo

Mostrar en la principal cuentas regresivas (días, horas, minutos) para eventos del colectivo
("Concierto en nuestra sede — faltan 12 días 4 h 30 min"), respetando la estética actual del sitio
(navy + acento del tema, Gotham). Solo las cuentas autorizadas por administración pueden crearlas,
ligadas a un evento o libres.

## Decisiones tomadas

- Contador como entidad propia (`CuentaRegresiva`), con evento opcional. Libre = sin `publicacion`.
- Permiso por usuario (`puedeCrearCuentaRegresiva`), asignado en "Gestión de Usuarios".
  Admins (`tipoUsuario` 0 y 1) siempre lo tienen.
- Al crear un evento, el contador es **opcional**: casilla "Mostrar cuenta regresiva en la principal",
  visible solo para cuentas autorizadas.
- Presentación como **lista jerárquica**, no carrusel: el más próximo destacado, hasta 3 más en filas
  pequeñas. Máximo 4 en total.
- Sin segundos: se actualiza cada minuto.
- Zona horaria fija de Costa Rica (-06:00) para convertir fecha/hora del evento.

## Backend

### Usuario (`backend/src/models/usuario.model.ts`, `interfaces/usuario.interface.ts`)

- Campo nuevo: `puedeCrearCuentaRegresiva: { type: Boolean, default: false }`.
- Helper `puedeGestionarCuentasRegresivas(usuario)`: `tipoUsuario` 0/1, o el campo en `true`.
  Siempre se lee del usuario en BD (igual que `auth.middleware.ts`), nunca del token.
- El endpoint que actualiza usuarios desde admin acepta el campo (solo admin/super-admin).

### Modelo `CuentaRegresiva` (`backend/src/models/cuentaRegresiva.model.ts`)

| Campo | Tipo | Notas |
|---|---|---|
| `titulo` | String, requerido, trim, max 120 | En contadores de evento se copia del título del evento |
| `fechaObjetivo` | Date, requerido, index | Instante real en UTC |
| `publicacion` | ObjectId → Publicacion, opcional, único (sparse) | Un contador por evento |
| `enlace` | String, opcional | Solo contadores libres; URL http(s) |
| `creadoPor` | ObjectId → Usuario, requerido | |
| `activo` | Boolean, default `true` | Desactivar sin borrar |
| timestamps | | |

### Utilidad de fecha (`backend/src/utils/cuentaRegresiva.ts`)

- `construirFechaObjetivo(fechaEvento: string, horaEvento?: string): Date | null`
  - Interpreta la fecha y hora como hora de Costa Rica (-06:00). Sin hora → 00:00.
  - Debe aceptar los formatos que hoy guarda el formulario de eventos (verificar en
    `publicacionModal.js` / controlador al implementar). Fecha inválida → `null` (no se crea contador).
- `finDelDiaCR(fecha: Date): Date`: 23:59:59.999 del mismo día en -06:00.

### Rutas `/api/cuentas-regresivas`

- `GET /activas` (pública): `activo: true`, `finDelDiaCR(fechaObjetivo) >= ahora`; si tiene
  `publicacion`, esta debe existir y estar `publicado: true`. Orden por `fechaObjetivo` asc,
  límite 4. Devuelve `_id, titulo, fechaObjetivo, enlace, publicacion { _id, tag }`.
- `GET /` (autenticado + permiso): admins ven todos; el resto, solo los suyos.
- `POST /` (autenticado + permiso): crea contador libre (`titulo`, `fechaObjetivo`, `enlace?`).
  Rechaza fechas pasadas.
- `PUT /:id`, `DELETE /:id` (autenticado + permiso; dueño o admin). En contadores ligados a un
  evento no se edita `fechaObjetivo` a mano (la manda el evento); sí `activo` y `titulo`.

### Integración con publicaciones (`publicacion.controller.ts`)

- Crear publicación con `tag === "evento"` y `mostrarCuentaRegresiva === "true"`: si el autor tiene
  permiso y `construirFechaObjetivo` devuelve fecha futura, crear el contador. Si no tiene permiso,
  se ignora el campo (sin error).
- Mientras el evento esté `publicado: false`, `/activas` no lo muestra (no hay que hacer nada extra).
- Cuando se aplica un cambio de `fechaEvento`/`horaEvento`/`titulo` (edición directa o aprobación
  de edición pendiente), recalcular el contador ligado.
- Al eliminar la publicación, eliminar su contador.
- En la edición de un evento, una cuenta autorizada puede activar o quitar el contador con la misma
  casilla. La casilla actúa al momento (`POST /cuentas-regresivas/evento/:publicacionId` o
  `DELETE /cuentas-regresivas/:id`) y no pasa por la aprobación de ediciones, que solo aplica al
  contenido del evento.

## Frontend

### Principal

- Componente nuevo `components/CuentasRegresivas.js` + `CSS/cuentasRegresivas.css`.
- `PantallaInicio.js` carga `/cuentas-regresivas/activas` junto al resto (en paralelo) y lo pasa a
  `InicioPrincipal`, que lo renderiza como banda propia **después de `hero-copy-band`** y antes de
  "Quiénes somos". Sin contadores → la banda no se renderiza (ni título).
- Destacado: etiqueta "Próximamente", título grande, fecha en texto ("Sábado 14 de diciembre ·
  7:00 p. m.", `Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica' })`), y bloques
  días / horas / minutos con `font-variant-numeric: tabular-nums` en `--kw-accent` sobre navy.
- Lista: hasta 3 filas con título, fecha corta y "en N días" / "en N h". Separadores finos, sin tarjetas.
- Si el contador tiene evento, el título lleva al detalle del evento; si es libre con `enlace`, abre el enlace.
- Un solo `setInterval` de 60 s (alineado al minuto) para toda la banda; se limpia al desmontar.
- Llega a cero → "¡Hoy es el día!" hasta fin del día CR; después se quita en cliente sin recargar.
- Móvil: una columna, números con `clamp()`. Respeta `prefers-reduced-motion` (sin animación de cambio de dígitos).
- Accesibilidad: el contador visual es `aria-hidden`; texto equivalente para lectores ("Faltan 12 días,
  4 horas y 30 minutos") que no se anuncia en cada minuto (sin `aria-live`).

### Formulario de eventos

- En `publicacionModal.js` (y en la edición de eventos), si `tag === "evento"` y el usuario tiene
  permiso: casilla "Mostrar cuenta regresiva en la principal", desmarcada por defecto.
- El permiso del usuario llega con los datos de sesión (`AuthContext`); confirmar que el backend lo incluye.

### Gestión de Usuarios (`perfilUsuario.js`)

- Interruptor "Cuenta regresiva" por usuario (solo visible para admins). Para usuarios admin se
  muestra activo y deshabilitado.

### Sección "Cuentas regresivas" en el perfil

- Visible para cuentas con permiso. Lista (próximas primero, luego vencidas), crear libre
  (título, fecha, hora, enlace opcional), editar, activar/desactivar, eliminar con `ConfirmDialog`.

## Casos borde

- 0 contadores: no hay banda. 1: solo el destacado. 5 o más: se muestran los 4 más próximos.
- Títulos largos: el destacado envuelve en 2–3 líneas; las filas recortan con elipsis.
- Evento sin fecha válida: no se crea contador; el formulario avisa con un toast.
- Se quita el permiso a un usuario: sus contadores siguen visibles hasta que un admin los desactive
  (no se borran en cascada).

## Pruebas

- Jest (backend): `construirFechaObjetivo` (con/sin hora, -06:00, inválidos), `finDelDiaCR`,
  y el filtro de `/activas` (vencidos, inactivos, eventos sin publicar, límite y orden).
- Manual: banda en escritorio y móvil con 0, 1 y 4 contadores; crear evento con y sin casilla;
  cambiar fecha del evento; eliminar evento; asignar/quitar permiso.

## Fuera de alcance

- Imágenes propias en contadores libres, segundos, notificaciones al llegar a cero, y más de 4 visibles.
