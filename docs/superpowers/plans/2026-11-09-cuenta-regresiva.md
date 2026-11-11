# UI65 Cuenta regresiva — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contadores regresivos (días/horas/minutos) en la principal, creados por cuentas autorizadas, ligados a un evento o libres.

**Architecture:** Modelo Mongo propio `CuentaRegresiva` con referencia opcional a `Publicacion`. Un servicio (`cuentaRegresiva.service.ts`) concentra la sincronización con eventos y lo llaman los controladores de publicaciones. El frontend agrega una banda en `InicioPrincipal`, una casilla en el formulario de eventos, un interruptor en Gestión de Usuarios y una página de gestión `/cuentas-regresivas`.

**Tech Stack:** Node + Express + TypeScript + Mongoose, Jest + supertest (backend); React 19 CRA, react-router 7, react-hot-toast, CSS por componente (frontend).

**Spec:** `docs/superpowers/specs/2026-11-09-cuenta-regresiva-design.md`

## Global Constraints

- Zona horaria fija de Costa Rica: offset `-06:00` (backend), `timeZone: "America/Costa_Rica"` y locale `es-CR` (frontend).
- `fechaEvento` llega como `"YYYY-MM-DD"`; `horaEvento` como `"HH:mm"` (24 h) o vacío → 00:00.
- Permiso = `tipoUsuario` 0 o 1, **o** `puedeCrearCuentaRegresiva === true`, leído siempre del usuario en BD (`req.user` ya viene de BD por `authMiddleware`).
- `GET /activas` devuelve máximo **4**, orden `fechaObjetivo` ascendente.
- Un contador por evento (`publicacion` único, sparse). Solo publicaciones con `tag === "evento"` (nunca la publicación automática con `publicacionOrigenId`).
- Sin segundos; refresco cada 60 s alineado al minuto.
- Textos de UI exactos: "Próximamente", "Mostrar cuenta regresiva en la principal", "¡Hoy es el día!", "Cuenta regresiva", "Cuentas regresivas".
- `titulo` máx. 120 caracteres; `enlace` solo `http://` o `https://`.
- **Pruebas con BD:** `backend/.env` apunta a una BD en Railway. Toda prueba que use Mongo se corre con `BD_URL` apuntando a una BD local de pruebas, por ejemplo:
  `BD_URL=mongodb://localhost:27017/komuness_test npx jest <archivo>` (dotenv no pisa variables ya definidas). Si no hay Mongo local, correr solo las pruebas puras y avisar.
- No commitear `.env*`. Commits en la rama `branch-testing-changes` solo si el usuario lo autoriza al ejecutar.

## Review Focus

1. **Publicación automática duplicada:** `createPublicacionA` crea una copia `tag: "publicacion"` con `fechaEvento`; el contador debe quedar ligado solo al evento original. → prueba en Task 4.
2. **Navegador fuera de Costa Rica:** la fecha mostrada y el "¡Hoy es el día!" deben calcularse en hora CR, no en la del navegador. → prueba de `finDelDiaCR` en Task 1 y `formatearFechaCR` en Task 5.
3. **Usuario sin permiso que manda `mostrarCuentaRegresiva=true` a mano:** se ignora, el evento se crea igual. → prueba en Task 4.
4. **Evento con fecha pasada o inválida:** no se crea contador y la creación del evento no falla. → prueba en Task 4.
5. **Pestaña en segundo plano horas y luego vuelve:** el contador debe recalcularse desde `Date.now()`, no acumular ticks. → prueba en Task 5 (`calcularRestante` es puro).

---

### Task 1: Utilidades de fecha

**Files:**
- Create: `backend/src/utils/cuentaRegresiva.ts`
- Test: `backend/src/test/cuentaRegresivaFecha.test.ts`

**Interfaces:**
- Produces: `construirFechaObjetivo(fechaEvento: unknown, horaEvento?: unknown): Date | null`, `finDelDiaCR(fecha: Date): Date`.

- [ ] **Step 1: Write the failing tests** (sin BD)

```ts
import { construirFechaObjetivo, finDelDiaCR } from '../utils/cuentaRegresiva';

test('fecha y hora se interpretan en -06:00', () => {
  expect(construirFechaObjetivo('2026-12-14', '19:00')!.toISOString()).toBe('2026-12-15T01:00:00.000Z');
});
test('sin hora usa 00:00 CR', () => {
  expect(construirFechaObjetivo('2026-12-14', '')!.toISOString()).toBe('2026-12-14T06:00:00.000Z');
  expect(construirFechaObjetivo('2026-12-14')!.toISOString()).toBe('2026-12-14T06:00:00.000Z');
});
test('inválidos devuelven null', () => {
  for (const f of ['', '14/12/2026', '2026-13-01', '2026-02-30', undefined, 42]) {
    expect(construirFechaObjetivo(f as any, '10:00')).toBeNull();
  }
  expect(construirFechaObjetivo('2026-12-14', '25:00')).toBeNull();
});
test('finDelDiaCR devuelve 23:59:59.999 del día CR', () => {
  // 2026-12-15T01:00Z es 14 dic 19:00 en CR
  expect(finDelDiaCR(new Date('2026-12-15T01:00:00Z')).toISOString()).toBe('2026-12-15T05:59:59.999Z');
});
```

- [ ] **Step 2: Run** `cd backend && npx jest src/test/cuentaRegresivaFecha.test.ts` → FAIL (módulo no existe).
- [ ] **Step 3: Implement.** Validar con regex `^\d{4}-\d{2}-\d{2}$` y `^\d{2}:\d{2}$` (hora vacía/ausente → `"00:00"`; hora presente pero inválida → `null`), construir `new Date(\`${f}T${h}:00-06:00\`)` y rechazar si la fecha no "redondea" (comparar año/mes/día en CR contra la entrada, para cazar `2026-02-30`). `finDelDiaCR`: desplazar −6 h, tomar fecha UTC, devolver `new Date(\`${yyyy-mm-dd}T23:59:59.999-06:00\`)`.
- [ ] **Step 4: Run** el mismo comando → PASS.
- [ ] **Step 5: Commit** `feat(cuenta-regresiva): utilidades de fecha en hora CR`

### Task 2: Modelo, permiso de usuario y endpoint de admin

**Files:**
- Create: `backend/src/models/cuentaRegresiva.model.ts`
- Modify: `backend/src/models/usuario.model.ts` (campo nuevo), `backend/src/interfaces/usuario.interface.ts` (`puedeCrearCuentaRegresiva?: boolean`)
- Modify: `backend/src/utils/cuentaRegresiva.ts` (helper de permiso)
- Modify: `backend/src/controllers/usuario.controller.ts`, `backend/src/routes/usuario.routes.ts`
- Test: `backend/src/test/cuentaRegresivaPermiso.test.ts`

**Interfaces:**
- Produces: `modelCuentaRegresiva` con campos de la spec (`titulo`, `fechaObjetivo` index, `publicacion` ref `Publicacion` unique+sparse, `enlace`, `creadoPor` ref `Usuario` required, `activo` default true, timestamps).
- Produces: `puedeGestionarCuentasRegresivas(usuario: { tipoUsuario: number; puedeCrearCuentaRegresiva?: boolean } | null | undefined): boolean`.
- Produces: `PUT /api/usuario/:id/cuenta-regresiva` body `{ puedeCrearCuentaRegresiva: boolean }`, `authMiddleware, verificarRoles([0, 1])`, responde `{ success: true, data: usuarioSinPassword }`; 400 si no es booleano; 404 si no existe. Controlador `actualizarPermisoCuentaRegresiva` siguiendo el patrón de `actualizarLimiteUsuario`. Registrar la ruta junto a `/:id/limite` (antes de `router.put("/:id", ...)`).

- [ ] **Step 1: Write failing tests** — puros para el helper (`{tipoUsuario:0}`→true, `1`→true, `2`→false, `{tipoUsuario:3, puedeCrearCuentaRegresiva:true}`→true, `null`→false); con BD + supertest: admin (`crearUsuarioConToken(1)`) pone `true` a un básico → 200 y `data.puedeCrearCuentaRegresiva === true`; básico llamando al endpoint → 403; body `"si"` → 400.
- [ ] **Step 2: Run** con `BD_URL` local → FAIL.
- [ ] **Step 3: Implement** modelo, campo, helper, controlador y ruta.
- [ ] **Step 4: Run** → PASS. Confirmar que `GET /api/usuario/check` y el login devuelven el campo (salen del documento completo menos password); si el login arma el objeto a mano, agregar el campo.
- [ ] **Step 5: Commit** `feat(cuenta-regresiva): modelo y permiso por usuario`

### Task 3: API `/api/cuentas-regresivas`

**Files:**
- Create: `backend/src/services/cuentaRegresiva.service.ts` (crear carpeta si no existe; si el proyecto no usa `services/`, ponerlo en `utils/cuentaRegresiva.service.ts`)
- Create: `backend/src/controllers/cuentaRegresiva.controller.ts`, `backend/src/routes/cuentaRegresiva.routes.ts`
- Modify: `backend/src/index.ts` (`app.use("/api/cuentas-regresivas", cuentaRegresivaRoutes)`)
- Test: `backend/src/test/cuentaRegresivaApi.test.ts`

**Interfaces:**
- Consumes: Task 1 y Task 2.
- Produces (service):
  - `obtenerActivas(ahora?: Date): Promise<CuentaRegresivaPublica[]>` donde `CuentaRegresivaPublica = { _id, titulo, fechaObjetivo, enlace?, publicacion?: { _id, tag } }`.
  - `sincronizarCuentaRegresivaDeEvento(publicacion: { _id, tag, titulo, fechaEvento?, horaEvento?, publicacionOrigenId? }, opciones: { crearSiNoExiste: boolean; creadoPor?: string }): Promise<'creada' | 'actualizada' | 'omitida'>` — omite si `tag !== 'evento'`, si tiene `publicacionOrigenId`, o si la fecha es `null`. Si existe, actualiza `titulo` y `fechaObjetivo`. Si no existe y `crearSiNoExiste`, la crea solo si la fecha es futura.
  - `eliminarCuentaRegresivaDeEvento(publicacionId: string): Promise<void>`.
- Produces (rutas):
  - `GET /activas` pública → `{ data: CuentaRegresivaPublica[] }`. Filtro: `activo`, `fechaObjetivo >= inicio del día CR de hoy` y en memoria `finDelDiaCR(fechaObjetivo) >= ahora`; los ligados se `populate('publicacion', 'tag publicado')` y se descartan si la publicación no existe o `publicado !== true`. Ordenar y cortar a 4 **después** de filtrar.
  - `GET /` (auth + permiso) → admins todos, resto `creadoPor = yo`; orden: próximas asc, luego vencidas desc. `populate('publicacion', 'titulo tag')`.
  - `POST /` (auth + permiso) body `{ titulo, fechaObjetivo (ISO), enlace? }` → 201. 400 si falta título, >120, fecha inválida o pasada, enlace no http(s).
  - `POST /evento/:publicacionId` (auth + permiso; dueño del evento o admin) → crea con `sincronizar…({crearSiNoExiste:true})`; 201 si `'creada'`, 200 si ya existía, 400 si `'omitida'` con mensaje "El evento no tiene una fecha futura válida".
  - `PUT /:id` (auth + permiso; dueño o admin) → edita `titulo`, `activo`, `enlace`; `fechaObjetivo` solo si el contador es libre.
  - `DELETE /:id` (auth + permiso; dueño o admin) → 200.
  - Middleware local `requierePermisoCuentaRegresiva` (403 `{ message: 'No tienes permiso para gestionar cuentas regresivas' }`) usando el helper.

- [ ] **Step 1: Write failing tests** (BD local): 
  - `/activas` excluye: inactivo, vencido ayer, ligado a evento `publicado:false`; incluye uno de hoy ya pasada la hora (sigue hasta fin del día CR); con 6 válidos devuelve 4 en orden asc.
  - `POST /` con básico sin permiso → 403; con básico con permiso → 201; fecha pasada → 400; `enlace: "javascript:alert(1)"` → 400.
  - `PUT`/`DELETE` de un contador ajeno con básico autorizado → 403; con admin → 200.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** service, controlador, rutas y registro en `index.ts`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(cuenta-regresiva): API pública y de gestión`

### Task 4: Enganche con publicaciones

**Files:**
- Modify: `backend/src/controllers/publicacion.controller.ts` — `createPublicacion` (tras `save()` ~l.325), `createPublicacionA` (tras `save()` ~l.477, antes de crear la automática), `updatePublicacion` (tras `findByIdAndUpdate` ~l.825), `deletePublicacion` (tras borrar, también por cada documento en `documentosBorrados`).
- Modify: `backend/src/controllers/publicacion-update.controller.ts` — `approveUpdate` tras `publicacion.save()` (~l.550).
- Test: `backend/src/test/cuentaRegresivaEvento.test.ts`

**Interfaces:**
- Consumes: `sincronizarCuentaRegresivaDeEvento`, `eliminarCuentaRegresivaDeEvento`, `puedeGestionarCuentasRegresivas`.
- Creación: si `parseBoolean(body.mostrarCuentaRegresiva) === true` **y** `puedeGestionarCuentasRegresivas(req.user)` → `sincronizar(savePost, { crearSiNoExiste: true, creadoPor: userId })`. En otro caso no se crea nada. Envolver en `try/catch` con `console.warn`: un fallo del contador nunca rompe la creación del evento.
- Update/approve: `sincronizar(pub, { crearSiNoExiste: false })` (solo actualiza si ya existe).
- Delete: `eliminarCuentaRegresivaDeEvento(id)`.

- [ ] **Step 1: Write failing tests** (BD local, `POST /api/publicaciones/` con `tag: 'evento'`, fecha futura `YYYY-MM-DD` calculada en la prueba):
  - admin + `mostrarCuentaRegresiva: 'true'` → existe 1 contador con `publicacion = evento._id` y `fechaObjetivo` = `construirFechaObjetivo(...)`.
  - básico **sin** permiso + `'true'` → 201 y 0 contadores.
  - admin sin la casilla → 0 contadores.
  - admin + casilla + fecha pasada → 201 y 0 contadores.
  - `PUT /api/publicaciones/:id` cambiando `fechaEvento` → `fechaObjetivo` actualizada.
  - `DELETE /api/publicaciones/:id` → contador eliminado.
  - Ruta `/v2` (multipart, sin archivos) con casilla → exactamente 1 contador y ligado al `tag: 'evento'`, no a la automática.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** los enganches.
- [ ] **Step 4: Run** este archivo y además `src/test/publicacion.test.ts` y `src/test/publicacionAutomatica.test.ts` → PASS (sin regresiones).
- [ ] **Step 5: Commit** `feat(cuenta-regresiva): sincronizar con eventos`

### Task 5: Banda en la principal

**Files:**
- Create: `FrontEnd/src/utils/cuentaRegresiva.js`
- Create: `FrontEnd/src/components/CuentasRegresivas.js`, `FrontEnd/src/CSS/cuentasRegresivas.css`
- Modify: `FrontEnd/src/components/PantallaInicio.js` (fetch en el `Promise.all`, estado `cuentasRegresivas`), `FrontEnd/src/components/InicioPrincipal.js` (prop `cuentasRegresivas`, render tras `hero-copy-band`)
- Test: `FrontEnd/src/utils/cuentaRegresiva.test.js`

**Interfaces:**
- Consumes: `GET ${API_URL}/cuentas-regresivas/activas` → `{ data: [...] }`. Si falla, `[]` sin romper la página.
- Produces: `calcularRestante(fechaObjetivoISO, ahoraMs) => { dias, horas, minutos, esHoy, terminado }` — `esHoy` cuando ya pasó la hora objetivo pero no el fin del día CR; `terminado` después; `formatearFechaCR(iso) => string` ("sábado, 14 de diciembre · 7:00 p. m.", con `Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', weekday:'long', day:'numeric', month:'long', hour:'numeric', minute:'2-digit' })`, primera letra en mayúscula); `textoCorto(restante) => "en 12 días" | "en 5 h" | "en 30 min" | "Hoy"`.

- [ ] **Step 1: Write failing tests** (`cd FrontEnd && CI=true npx react-scripts test src/utils/cuentaRegresiva.test.js`):
  - `calcularRestante('2026-12-15T01:00:00Z', Date.parse('2026-12-02T22:30:00Z'))` → `{ dias: 12, horas: 2, minutos: 30, esHoy: false, terminado: false }`.
  - Una hora después del objetivo, mismo día CR → `esHoy: true, terminado: false`; a las `2026-12-15T06:00:00Z` → `terminado: true`.
  - Saltar 5 h de golpe da lo mismo que calcular desde cero (es pura: no hay estado).
  - `formatearFechaCR('2026-12-15T01:00:00Z')` contiene "14 de diciembre" (aunque el entorno de pruebas esté en UTC).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement utils y componente.** El componente devuelve `null` si la lista (filtrada por `!terminado`) queda vacía. Estructura: `<section className="cr-banda" aria-labelledby="cr-titulo">` con `<p className="cr-etiqueta" id="cr-titulo">Próximamente</p>`; destacado `cr-destacado` (título `h2`, fecha, bloques días/horas/minutos `aria-hidden`, más `<p className="sr-only">Faltan X días, Y horas y Z minutos</p>` sin `aria-live`; si `esHoy` muestra "¡Hoy es el día!" en lugar de los bloques); lista `cr-lista` con hasta 3 `<li>` (título con elipsis, fecha corta, `textoCorto`). Título enlazado: con `publicacion` → `<Link to={/eventos/${publicacion._id}}>`; libre con `enlace` → `<a target="_blank" rel="noreferrer">`; si no, texto. Un `setTimeout` hasta el próximo minuto y luego `setInterval(60000)` que solo hace `setAhora(Date.now())`; también actualizar en `visibilitychange`. Limpiar todo al desmontar.
  CSS: reutilizar tokens de `inicioPrincipal.css` (`--kw-accent`, `--kw-navy`, `--kw-text`, `--kw-text-muted`, `--kw-space-section`, `--kw-ease-out`); cifras `font-variant-numeric: tabular-nums`, tamaño `clamp(2.5rem, 7vw, 5rem)` en el destacado; filas separadas por `1px` con `--kw-text-muted` al 20 %; una columna en `<768px`; `@media (prefers-reduced-motion: reduce)` sin transiciones. Si `.sr-only` no existe en el proyecto, definirla en este CSS.
- [ ] **Step 4: Run** pruebas → PASS. Revisar en el navegador (`npm start` con el backend local) con 0, 1 y 4 contadores, en 1280 px y 375 px.
- [ ] **Step 5: Commit** `feat(cuenta-regresiva): banda en la principal`

### Task 6: Casilla en el formulario de eventos y en la edición

**Files:**
- Modify: `FrontEnd/src/pages/formulario.js` (estado inicial ~l.78, `data.append` ~l.327, bloque de fecha/hora ~l.780)
- Modify: `FrontEnd/src/components/EditarPublicacionModal.js`
- Create: `FrontEnd/src/utils/permisos.js`

**Interfaces:**
- Produces: `puedeGestionarCuentasRegresivas(user) => boolean` (misma regla que el backend).
- Formulario: campo `mostrarCuentaRegresiva: false`; checkbox con el texto exacto, visible solo si `formData.tag === "evento"` y el permiso; `data.append("mostrarCuentaRegresiva", String(formData.mostrarCuentaRegresiva))`.
- Edición (solo eventos y usuarios con permiso): al abrir, consultar `GET /cuentas-regresivas` y ver si hay uno con `publicacion._id === id`. La casilla aplica **al momento** (no pasa por la aprobación de ediciones): marcar → `POST /cuentas-regresivas/evento/:id`; desmarcar → `DELETE /cuentas-regresivas/:cuentaId`. Mostrar `toast.success`/`toast.error` con el mensaje del backend. (Así lo define la spec: la casilla de edición actúa directo, sin esperar la aprobación de ediciones.)

- [ ] **Step 1:** Implementar el formulario. Verificar a mano: admin crea un evento con la casilla → aparece en la principal; básico sin permiso no ve la casilla.
- [ ] **Step 2:** Implementar la edición. Verificar: activar y desactivar desde la edición se refleja en la principal tras recargar.
- [ ] **Step 3:** Fecha inválida/pasada con la casilla marcada: el evento se crea y se muestra `toast` "El evento se creó, pero no tiene una fecha futura para la cuenta regresiva" (el frontend lo decide comparando `fechaEvento`/`horaEvento` antes de enviar).
- [ ] **Step 4: Commit** `feat(cuenta-regresiva): casilla en formulario y edición de eventos`

### Task 7: Interruptor en Gestión de Usuarios

**Files:**
- Modify: `FrontEnd/src/components/perfilUsuario.js` (tabla ~l.1565: nueva columna `<th>Cuenta regresiva</th>`)
- Modify: `FrontEnd/src/CSS/perfilUsuario.css` (estilo del interruptor, si no hay uno reutilizable)

**Interfaces:**
- Consumes: `PUT ${API_URL}/usuario/:id/cuenta-regresiva`.
- Checkbox con `role="switch"` y `aria-label={\`Cuenta regresiva para ${nombre}\`}`. Para `tipoUsuario` 0/1: marcado y `disabled` con `title="Los administradores siempre tienen este permiso"`. Actualización optimista en `setUsuarios`; si falla, revertir y `toast.error`.

- [ ] **Step 1:** Implementar. Verificar: dar permiso a un básico → al iniciar sesión con él, ve la casilla en el formulario de eventos; quitarlo → ya no.
- [ ] **Step 2:** Revisar la tabla en 375 px (la columna nueva no debe romper `pu-tabla-wrapper`).
- [ ] **Step 3: Commit** `feat(cuenta-regresiva): permiso en gestión de usuarios`

### Task 8: Página de gestión `/cuentas-regresivas`

**Files:**
- Create: `FrontEnd/src/components/adminCuentasRegresivas.js`, `FrontEnd/src/CSS/adminCuentasRegresivas.css` (seguir el patrón de `adminCategorias.js` / `adminModales.css`)
- Modify: `FrontEnd/src/components/Rutas.js` (`<Route path="/cuentas-regresivas" ...>`), `FrontEnd/src/components/perfilUsuario.js` (botón "Cuentas regresivas" en `pu-acciones`, solo con permiso)

**Interfaces:**
- Consumes: `GET/POST/PUT/DELETE ${API_URL}/cuentas-regresivas`.
- Sin permiso → `<Navigate to="/" replace />`.
- Lista: título, fecha (`formatearFechaCR`), origen ("Evento: {titulo}" o "Libre"), estado (Activo/Inactivo/Vencido), acciones editar, activar/desactivar, eliminar (con `ConfirmDialog`). Estado vacío: "Todavía no hay cuentas regresivas."
- Formulario crear/editar libre: título (máx. 120, contador de caracteres), fecha `type="date"`, hora `type="time"`, enlace opcional. Convierte fecha+hora a ISO con offset `-06:00` antes de enviar. En contadores de evento, fecha y hora se muestran deshabilitadas con la nota "La fecha la toma del evento".

- [ ] **Step 1:** Implementar la página y la ruta. Verificar: crear libre → aparece en la principal; desactivar → desaparece; eliminar pide confirmación.
- [ ] **Step 2:** Verificar que un básico autorizado no puede editar contadores de otro (el backend responde 403 y se muestra el `toast`).
- [ ] **Step 3: Commit** `feat(cuenta-regresiva): página de gestión`

### Task 9: Verificación final

- [ ] Correr todas las pruebas del backend con BD local: `cd backend && BD_URL=mongodb://localhost:27017/komuness_test npm test` → todo PASS.
- [ ] `cd backend && npm run build` sin errores de TypeScript.
- [ ] `cd FrontEnd && CI=true npx react-scripts test --watchAll=false` → PASS; `npm run build` sin errores.
- [ ] Recorrido manual de la lista de "Pruebas" de la spec (0/1/4 contadores, escritorio y móvil, crear/editar/borrar evento, asignar/quitar permiso).
