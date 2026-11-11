"use strict";
// src/controllers/publicacion.controller.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchByTitulo = exports.searchPublicacionesAvanzada = exports.searchPublicacionesByTitulo = exports.getEventosPorFecha = exports.filterPublicaciones = exports.addRespuesta = exports.addComentario = exports.deletePublicacion = exports.updatePublicacion = exports.getPublicacionesByCategoria = exports.getPublicacionById = exports.getPublicacionesByTag = exports.createPublicacionA = exports.createPublicacion = void 0;
const publicacion_model_1 = require("../models/publicacion.model");
const mongoose_1 = __importDefault(require("mongoose"));
const gridfs_1 = require("../utils/gridfs");
const publicacionExpiration_1 = require("../utils/publicacionExpiration");
const mail_1 = require("../utils/mail"); // usa el mismo transporter que recuperación
const usuario_model_1 = require("../models/usuario.model"); // ← Modelo de usuarios
const notificacion_service_1 = require("../services/notificacion.service");
const LOG_ON = process.env.LOG_PUBLICACION === "1";
// Utilidad: normaliza precio (string → number | undefined)
function parsePrecio(input) {
    if (input === undefined || input === null)
        return undefined;
    if (typeof input === "number" && Number.isFinite(input))
        return input;
    if (typeof input === "string") {
        const trimmed = input.trim();
        if (!trimmed)
            return undefined;
        const cleaned = trimmed.replace(/[₡$,]/g, "");
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
}
function parseBoolean(input) {
    if (input === undefined || input === null || input === "")
        return undefined;
    if (typeof input === "boolean")
        return input;
    if (typeof input === "string") {
        const normalized = input.trim().toLowerCase();
        if (normalized === "true" || normalized === "1")
            return true;
        if (normalized === "false" || normalized === "0")
            return false;
    }
    return undefined;
}
// Construye el filtro de fecha para publicaciones/eventos/emprendimientos.
// Si solo se da fechaInicio, filtra ese día puntual. Si se dan ambas, filtra el rango (inclusivo).
// Eventos usan fechaEvento (string "YYYY-MM-DD", comparable lexicográficamente);
// publicaciones/emprendimientos usan el rango de createdAt.
function buildFechaFilter(fechaInicio, fechaFin, tag) {
    if (!fechaInicio && !fechaFin)
        return null;
    const inicioStr = fechaInicio || fechaFin;
    const finStr = fechaFin || fechaInicio;
    const inicioDate = new Date(inicioStr);
    const finDate = new Date(finStr);
    finDate.setDate(finDate.getDate() + 1);
    const filtroEvento = { fechaEvento: { $gte: inicioStr, $lte: finStr } };
    const filtroNoEvento = { createdAt: { $gte: inicioDate, $lt: finDate } };
    if (tag === "evento")
        return { field: filtroEvento };
    if (tag)
        return { field: filtroNoEvento };
    return {
        or: [
            Object.assign({ tag: "evento" }, filtroEvento),
            Object.assign({ tag: { $ne: "evento" } }, filtroNoEvento),
        ],
    };
}
function parseMoneda(input) {
    if (input === undefined || input === null)
        return undefined;
    if (typeof input !== "string")
        return undefined;
    const normalized = input.trim().toUpperCase();
    if (normalized === "CRC" || normalized === "USD")
        return normalized;
    return undefined;
}
function getMonedaData(inputMoneda, inputMonedaSimbolo) {
    var _a;
    const moneda = (_a = parseMoneda(inputMoneda)) !== null && _a !== void 0 ? _a : (inputMonedaSimbolo === "$" ? "USD" : "CRC");
    return {
        moneda,
        monedaSimbolo: moneda === "USD" ? "$" : "₡",
    };
}
// función para validar teléfono
function parseTelefono(input) {
    if (typeof input !== "string")
        return undefined;
    const trimmed = input.trim();
    return trimmed || undefined;
}
// función para validar enlaces externos
function parseEnlacesExternos(input) {
    if (!input)
        return undefined;
    try {
        if (typeof input === "string") {
            const parsed = JSON.parse(input);
            if (Array.isArray(parsed)) {
                return parsed
                    .filter((enlace) => enlace &&
                    typeof enlace.nombre === "string" &&
                    typeof enlace.url === "string" &&
                    enlace.nombre.trim() !== "" &&
                    enlace.url.trim() !== "")
                    .map((enlace) => (Object.assign(Object.assign({}, enlace), { url: formatearUrlEnlace(enlace.url) })));
            }
        }
        return undefined;
    }
    catch (_a) {
        return undefined;
    }
}
function formatearUrlEnlace(url) {
    const urlLimpia = url.trim();
    // Si es un correo sin mailto:
    if (urlLimpia.includes("@") && !urlLimpia.startsWith("mailto:")) {
        return `mailto:${urlLimpia}`;
    }
    // Si es un teléfono sin tel:
    const soloNumeros = urlLimpia.replace(/[\s\-\+\(\)]/g, "");
    if (/^\d+$/.test(soloNumeros) && !urlLimpia.startsWith("tel:")) {
        return `tel:${urlLimpia}`;
    }
    return urlLimpia;
}
function mustRequirePrecio(tag) {
    return tag === "evento";
}
function validateAndNormalizePricing(tag, precio, precioNegociable, precioEstudiante, precioCiudadanoOro) {
    if (tag === "evento") {
        if (precio === undefined) {
            return {
                error: "El campo precio regular es obligatorio y debe ser numérico para eventos.",
                precio,
                precioNegociable: false,
                precioEstudiante,
                precioCiudadanoOro,
            };
        }
        return {
            precio,
            precioNegociable: false,
            precioEstudiante,
            precioCiudadanoOro,
        };
    }
    if (tag === "emprendimiento") {
        if (precioNegociable) {
            return {
                precio: undefined,
                precioNegociable: true,
                precioEstudiante: undefined,
                precioCiudadanoOro: undefined,
            };
        }
        if (precio === undefined) {
            return {
                error: "Para emprendimientos debes indicar un precio regular o marcarlo como precio negociable.",
                precio,
                precioNegociable,
                precioEstudiante,
                precioCiudadanoOro,
            };
        }
    }
    return {
        precio,
        precioNegociable,
        precioEstudiante,
        precioCiudadanoOro,
    };
}
// Normaliza hora del evento en formato HH:mm (24h). Si no cumple, se ignora.
function parseHoraEvento(input) {
    if (typeof input !== "string")
        return undefined;
    const t = input.trim();
    return /^\d{2}:\d{2}$/.test(t) ? t : undefined;
}
// función para validar ubicación
function parseUbicacion(input) {
    if (!input)
        return undefined;
    try {
        let ubicacion;
        // Si es string (JSON), parsear
        if (typeof input === "string") {
            ubicacion = JSON.parse(input);
        }
        else {
            ubicacion = input;
        }
        // Validar que tenga los campos necesarios
        if (!ubicacion || typeof ubicacion !== "object")
            return undefined;
        const lat = Number(ubicacion.latitude);
        const lng = Number(ubicacion.longitude);
        const dir = String(ubicacion.direccion).trim();
        // Validar rango de coordenadas válidas
        if (!Number.isFinite(lat) || lat < -90 || lat > 90)
            return undefined;
        if (!Number.isFinite(lng) || lng < -180 || lng > 180)
            return undefined;
        if (dir.length === 0 || dir.length > 500)
            return undefined;
        return {
            latitude: lat,
            longitude: lng,
            direccion: dir,
            mapLink: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
        };
    }
    catch (_a) {
        return undefined;
    }
}
// ───────────────────────────────────────────────────────────────────────────────
// Helper: correos de admins (tipoUsuario = 1) con email válido
// ───────────────────────────────────────────────────────────────────────────────
function getAdminEmails() {
    return __awaiter(this, void 0, void 0, function* () {
        const users = yield usuario_model_1.modelUsuario
            .find({
            tipoUsuario: 1, // 0=super-admin, 1=admin, 2=básico, 3=premium
            email: { $exists: true, $ne: "" },
        })
            .select("email")
            .lean();
        const emails = users.map((u) => u.email).filter(Boolean);
        return Array.from(new Set(emails)); // dedup
    });
}
// Crear una publicación (sin adjuntos)
const createPublicacion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const body = req.body;
        // 🔴 Autor siempre desde el token
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ message: "Usuario no autenticado" });
            return;
        }
        const precio = parsePrecio(body.precio);
        const precioEstudiante = parsePrecio(body.precioEstudiante);
        const precioCiudadanoOro = parsePrecio(body.precioCiudadanoOro);
        const precioNegociable = parseBoolean(body.precioNegociable) === true;
        const tag = body.tag;
        const horaEvento = parseHoraEvento(body.horaEvento);
        const telefono = parseTelefono(body.telefono);
        const enlacesExternos = parseEnlacesExternos(body.enlacesExternos);
        const ubicacion = parseUbicacion(body.ubicacion);
        const monedaData = getMonedaData(body.moneda, body.monedaSimbolo);
        const pricing = validateAndNormalizePricing(tag, precio, precioNegociable, precioEstudiante, precioCiudadanoOro);
        if (pricing.error) {
            res.status(400).json({ message: pricing.error });
            return;
        }
        const publicacion = Object.assign(Object.assign({}, body), { autor: userId, publicado: `${body.publicado}` === "true", precio: pricing.precio, moneda: monedaData.moneda, monedaSimbolo: monedaData.monedaSimbolo, precioNegociable: pricing.precioNegociable, precioEstudiante: pricing.precioEstudiante, precioCiudadanoOro: pricing.precioCiudadanoOro, horaEvento,
            telefono,
            enlacesExternos,
            ubicacion });
        const nuevaPublicacion = new publicacion_model_1.modelPublicacion(publicacion);
        const savePost = yield nuevaPublicacion.save();
        // Notificación por correo a admins (aprobación)
        try {
            const asunto = "Nueva publicación para aprobar";
            const texto = `Se ha creado una nueva publicación que requiere aprobación.\n` +
                `Título: ${(_b = savePost.titulo) !== null && _b !== void 0 ? _b : "(sin título)"}\n` +
                `Fecha: ${new Date((_c = savePost.createdAt) !== null && _c !== void 0 ? _c : Date.now()).toISOString()}`;
            const emails = yield getAdminEmails();
            if (emails.length === 0) {
                if (LOG_ON)
                    console.warn("[Publicaciones][createPublicacion] No hay admins con email para notificar");
            }
            else {
                yield Promise.allSettled(emails.map((e) => (0, mail_1.sendEmail)(e, asunto, texto)));
            }
        }
        catch (e) {
            console.warn("[Publicaciones][createPublicacion] No se pudo enviar la notificación:", e);
        }
        res.status(201).json(savePost);
    }
    catch (error) {
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.createPublicacion = createPublicacion;
// Crear publicación con adjuntos v2 (GridFS)
const createPublicacionA = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const publicacion = req.body;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: "No autorizado" });
            return;
        }
        // 🔴 Autor siempre desde el token
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ ok: false, message: "Usuario no autenticado" });
            return;
        }
        // --- Recolectar archivos desde Multer (array o fields) ---
        let files = [];
        if (Array.isArray(req.files)) {
            files = req.files;
        }
        else if (req.files && typeof req.files === "object") {
            const map = req.files;
            files = [...((_b = map["archivos"]) !== null && _b !== void 0 ? _b : []), ...((_c = map["imagenes"]) !== null && _c !== void 0 ? _c : [])];
        }
        // --- Validar/establecer categoria ---
        let categoria = publicacion.categoria;
        if (!categoria) {
            const defId = process.env.DEFAULT_CATEGORIA_ID;
            if (defId && mongoose_1.default.Types.ObjectId.isValid(defId)) {
                categoria = defId;
            }
            else {
                res.status(400).json({
                    ok: false,
                    message: 'categoria es requerida (envía "categoria" o configura DEFAULT_CATEGORIA_ID en .env)',
                });
                return;
            }
        }
        // --- Precio / otros campos ---
        const precio = parsePrecio(publicacion.precio);
        const precioEstudiante = parsePrecio(publicacion.precioEstudiante);
        const precioCiudadanoOro = parsePrecio(publicacion.precioCiudadanoOro);
        const precioNegociable = parseBoolean(publicacion.precioNegociable) === true;
        const tag = publicacion.tag;
        const horaEvento = parseHoraEvento(publicacion.horaEvento);
        const telefono = parseTelefono(publicacion.telefono);
        const enlacesExternos = parseEnlacesExternos(publicacion.enlacesExternos);
        const ubicacion = parseUbicacion(publicacion.ubicacion);
        const monedaData = getMonedaData(publicacion.moneda, publicacion.monedaSimbolo);
        const pricing = validateAndNormalizePricing(tag, precio, precioNegociable, precioEstudiante, precioCiudadanoOro);
        if (pricing.error) {
            res.status(400).json({ ok: false, message: pricing.error });
            return;
        }
        // --- Subir adjuntos (0..N) ---
        const adjuntos = [];
        for (const file of files) {
            const result = yield (0, gridfs_1.saveMulterFileToGridFS)(file, "publicaciones");
            adjuntos.push({
                url: `${process.env.PUBLIC_BASE_URL || "http://159.54.148.238"}/api/files/${result.id.toString()}`,
                key: result.id.toString(),
            });
        }
        // --- Crear documento y guardar ---
        const nuevaPublicacion = new publicacion_model_1.modelPublicacion(Object.assign(Object.assign({}, publicacion), { autor: userId, // 🔴 forzamos autor desde el token
            categoria, adjunto: adjuntos, publicado: `${publicacion.publicado}` === "true", precio: pricing.precio, moneda: monedaData.moneda, monedaSimbolo: monedaData.monedaSimbolo, precioNegociable: pricing.precioNegociable, precioEstudiante: pricing.precioEstudiante, precioCiudadanoOro: pricing.precioCiudadanoOro, horaEvento,
            telefono,
            enlacesExternos,
            ubicacion }));
        const savePost = yield nuevaPublicacion.save();
        // Notificación por correo a admins (aprobación)
        try {
            const asunto = "Nueva publicación para aprobar";
            const texto = `Se ha creado una nueva publicación que requiere aprobación.\n` +
                `Título: ${(_d = savePost.titulo) !== null && _d !== void 0 ? _d : "(sin título)"}\n` +
                `Fecha: ${new Date((_e = savePost.createdAt) !== null && _e !== void 0 ? _e : Date.now()).toISOString()}`;
            const emails = yield getAdminEmails();
            if (emails.length === 0) {
                if (LOG_ON)
                    console.warn("[Publicaciones][createPublicacionA] No hay admins con email para notificar");
            }
            else {
                yield Promise.allSettled(emails.map((e) => (0, mail_1.sendEmail)(e, asunto, texto)));
            }
        }
        catch (e) {
            console.warn("[Publicaciones][createPublicacionA] No se pudo enviar la notificación:", e);
        }
        res.status(201).json(savePost);
    }
    catch (error) {
        console.error("createPublicacionA error:", error);
        const err = error;
        res.status(500).json({ ok: false, message: err.message });
    }
});
exports.createPublicacionA = createPublicacionA;
// obtener publicaciones por tag
const getPublicacionesByTag = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const offset = parseInt(req.query.offset) || 0;
        const limit = parseInt(req.query.limit) || 10;
        const { tag, publicado, categoria, fechaInicio, fechaFin, precioMin, precioMax } = req.query;
        const query = { $and: [(0, publicacionExpiration_1.buildActivePublicationQuery)()] };
        if (tag)
            query.tag = tag;
        if (publicado !== undefined)
            query.publicado = publicado === "true";
        if (categoria)
            query.categoria = categoria;
        const fechaFiltro = buildFechaFilter(fechaInicio, fechaFin, tag);
        if (fechaFiltro) {
            if ("field" in fechaFiltro) {
                Object.assign(query, fechaFiltro.field);
            }
            else {
                query.$and.push({ $or: fechaFiltro.or });
            }
        }
        if (precioMin || precioMax) {
            query.precio = {};
            if (precioMin)
                query.precio.$gte = Number(precioMin);
            if (precioMax)
                query.precio.$lte = Number(precioMax);
        }
        const [publicaciones, totalPublicaciones] = yield Promise.all([
            publicacion_model_1.modelPublicacion
                .find(query)
                .populate("autor", "nombre")
                .populate("categoria", "nombre estado")
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit),
            publicacion_model_1.modelPublicacion.countDocuments(query),
        ]);
        res.status(200).json({
            data: publicaciones,
            pagination: {
                offset,
                limit,
                total: totalPublicaciones,
                pages: Math.ceil(totalPublicaciones / Math.max(limit, 1)),
            },
        });
    }
    catch (error) {
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.getPublicacionesByTag = getPublicacionesByTag;
// Obtener una publicación por su ID
const getPublicacionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const publicacion = yield publicacion_model_1.modelPublicacion
            .findById(id)
            .populate("autor", "nombre")
            .populate("categoria", "nombre estado");
        if (!publicacion || publicacion.estaCaducada) {
            res.status(404).json({ message: "Publicación no encontrada" });
            return;
        }
        res.status(200).json(publicacion);
    }
    catch (error) {
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.getPublicacionById = getPublicacionById;
// Obtener publicaciones por categoría
const getPublicacionesByCategoria = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { categoriaId } = req.params;
        const offset = parseInt(req.query.offset) || 0;
        const limit = parseInt(req.query.limit) || 10;
        const query = Object.assign({ categoria: categoriaId, publicado: true }, (0, publicacionExpiration_1.buildActivePublicationQuery)());
        const [publicaciones, total] = yield Promise.all([
            publicacion_model_1.modelPublicacion
                .find(query)
                .populate("autor", "nombre")
                .populate("categoria", "nombre estado")
                .skip(offset)
                .limit(limit),
            publicacion_model_1.modelPublicacion.countDocuments(query),
        ]);
        res.status(200).json({
            data: publicaciones,
            pagination: {
                offset,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.getPublicacionesByCategoria = getPublicacionesByCategoria;
// Actualizar una publicación
const updatePublicacion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const updatedData = Object.assign({}, req.body);
        const publicacionActual = yield publicacion_model_1.modelPublicacion
            .findById(id)
            .populate("autor", "nombre apellido");
        if (!publicacionActual) {
            res.status(404).json({ message: "Publicacion no encontrada" });
            return;
        }
        if (updatedData.hasOwnProperty("precio")) {
            const parsed = parsePrecio(updatedData.precio);
            updatedData.precio = parsed;
        }
        if (updatedData.hasOwnProperty("precioEstudiante")) {
            updatedData.precioEstudiante = parsePrecio(updatedData.precioEstudiante);
        }
        if (updatedData.hasOwnProperty("precioCiudadanoOro")) {
            updatedData.precioCiudadanoOro = parsePrecio(updatedData.precioCiudadanoOro);
        }
        if (updatedData.hasOwnProperty("precioNegociable")) {
            updatedData.precioNegociable =
                parseBoolean(updatedData.precioNegociable) === true;
        }
        if (updatedData.hasOwnProperty("moneda") ||
            updatedData.hasOwnProperty("monedaSimbolo")) {
            const monedaData = getMonedaData(updatedData.moneda, updatedData.monedaSimbolo);
            updatedData.moneda = monedaData.moneda;
            updatedData.monedaSimbolo = monedaData.monedaSimbolo;
        }
        // Si viene horaEvento, normalizar a HH:mm (si no es válida, no pisa)
        if (updatedData.hasOwnProperty("horaEvento")) {
            const parsedHora = parseHoraEvento(updatedData.horaEvento);
            if (parsedHora !== undefined)
                updatedData.horaEvento = parsedHora;
            else
                delete updatedData.horaEvento;
        }
        const nextTag = (_a = updatedData.tag) !== null && _a !== void 0 ? _a : publicacionActual.tag;
        const nextPrecio = updatedData.hasOwnProperty("precio")
            ? updatedData.precio
            : publicacionActual.precio;
        const nextPrecioEstudiante = updatedData.hasOwnProperty("precioEstudiante")
            ? updatedData.precioEstudiante
            : publicacionActual.precioEstudiante;
        const nextPrecioCiudadanoOro = updatedData.hasOwnProperty("precioCiudadanoOro")
            ? updatedData.precioCiudadanoOro
            : publicacionActual.precioCiudadanoOro;
        const nextPrecioNegociable = updatedData.hasOwnProperty("precioNegociable")
            ? updatedData.precioNegociable === true
            : publicacionActual.precioNegociable === true;
        const pricing = validateAndNormalizePricing(nextTag, nextPrecio, nextPrecioNegociable, nextPrecioEstudiante, nextPrecioCiudadanoOro);
        if (pricing.error) {
            res.status(400).json({ message: pricing.error });
            return;
        }
        updatedData.fechaExpiracion =
            (_b = (0, publicacionExpiration_1.calculatePublicationExpirationDate)(Object.assign(Object.assign({}, publicacionActual.toObject()), updatedData))) !== null && _b !== void 0 ? _b : null;
        updatedData.precio = pricing.precio;
        updatedData.precioNegociable = pricing.precioNegociable;
        updatedData.precioEstudiante = pricing.precioEstudiante;
        updatedData.precioCiudadanoOro = pricing.precioCiudadanoOro;
        const publicacion = yield publicacion_model_1.modelPublicacion.findByIdAndUpdate(id, updatedData, { new: true });
        if (!publicacion) {
            res.status(404).json({ message: "Publicación no encontrada" });
            return;
        }
        //Notificación a usuarios suscritos a categoría
        const autor = publicacionActual.autor;
        if (!publicacionActual.publicado && updatedData.publicado === true) {
            const nombreAutor = [autor.nombre, autor.apellido].filter(Boolean).join(" ").trim();
            try {
                yield (0, notificacion_service_1.notificarNuevaPublicacion)({
                    autor: nombreAutor,
                    contenidoBreve: publicacionActual.contenidoBreve,
                    publicacionId: id,
                    categoriaId: publicacionActual.categoria.toString()
                });
            }
            catch (notificacionError) {
                console.warn('No se pudo crear notificación de publicación', notificacionError);
            }
        }
        res.status(200).json(publicacion);
    }
    catch (error) {
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.updatePublicacion = updatePublicacion;
// Eliminar una publicación (y sus adjuntos en GridFS)
const deletePublicacion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deletedPost = yield publicacion_model_1.modelPublicacion.findByIdAndDelete(id);
        if (!deletedPost) {
            res.status(404).json({ message: "Publicación no encontrada" });
            return;
        }
        const adjuntos = deletedPost.adjunto;
        if (adjuntos === null || adjuntos === void 0 ? void 0 : adjuntos.length) {
            for (const a of adjuntos) {
                if (a.key) {
                    try {
                        yield (0, gridfs_1.deleteGridFSFile)(a.key);
                    }
                    catch (_a) { }
                }
            }
        }
        res.status(200).json({ message: "Publicación eliminada correctamente" });
    }
    catch (error) {
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.deletePublicacion = deletePublicacion;
// Agregar comentario
const addComentario = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { id } = req.params;
    const { contenido } = req.body;
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: "No autorizado" });
        return;
    }
    if (!(contenido === null || contenido === void 0 ? void 0 : contenido.trim())) {
        res
            .status(400)
            .json({ message: "El contenido del comentario es obligatorio" });
        return;
    }
    const nuevoComentario = {
        autor: {
            _id: user._id,
            nombre: user.nombre,
            apellido: user.apellido,
            avatar: user.avatar,
        },
        contenido: contenido.trim(),
        fecha: new Date().toISOString(),
    };
    try {
        const publicacionActualizada = yield publicacion_model_1.modelPublicacion.findByIdAndUpdate(id, { $push: { comentarios: nuevoComentario } }, { new: true });
        if (!publicacionActualizada) {
            res.status(404).json({ message: "Publicación no encontrada" });
            return;
        }
        const autorPublicacionId = (_b = (_a = publicacionActualizada.autor) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a);
        const autorComentarioId = (_d = (_c = user._id) === null || _c === void 0 ? void 0 : _c.toString) === null || _d === void 0 ? void 0 : _d.call(_c);
        if (autorPublicacionId &&
            autorComentarioId &&
            autorPublicacionId !== autorComentarioId) {
            const nombreComentarista = [user.nombre, user.apellido]
                .filter(Boolean)
                .join(" ")
                .trim();
            const tituloPublicacion = publicacionActualizada.titulo || "tu publicación";
            try {
                yield (0, notificacion_service_1.createComentarioPublicacionNotificacion)({
                    destinatarioId: autorPublicacionId, //temporalmente
                    recipientes: [autorPublicacionId],
                    publicacionId: id,
                    tituloPublicacion,
                    nombreComentarista,
                });
            }
            catch (notificacionError) {
                console.warn("No se pudo crear notificación de comentario:", notificacionError);
            }
        }
        res.status(201).json(publicacionActualizada.comentarios);
    }
    catch (error) {
        console.warn("Error al agregar comentario:", error);
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.addComentario = addComentario;
// Agregar Respuesta
const addRespuesta = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const { id, comentarioId } = req.params;
    const { contenido, replyTo } = req.body;
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: "No autorizado" });
        return;
    }
    const nuevaRespuesta = {
        autor: {
            _id: user._id,
            nombre: user.nombre,
            apellido: user.apellido,
            avatar: user.avatar,
        },
        contenido,
        fecha: new Date().toISOString(),
        replyTo,
    };
    try {
        const publicacionActualizada = yield publicacion_model_1.modelPublicacion.findOneAndUpdate({
            _id: id,
            "comentarios._id": new mongoose_1.default.Types.ObjectId(comentarioId),
        }, {
            $push: {
                "comentarios.$.respuestas": nuevaRespuesta,
            },
        }, { new: true });
        if (!publicacionActualizada) {
            res.status(404).json({ message: "Publicación no encontrada" });
            return;
        }
        const comentarios = publicacionActualizada.comentarios || [];
        const comentarioPrincipal = comentarios.find((comentario) => { var _a; return ((_a = comentario._id) === null || _a === void 0 ? void 0 : _a.toString()) === comentarioId; });
        let usuarioObjetivoId = null;
        if (comentarioPrincipal) {
            // comentario principal
            if (((_a = comentarioPrincipal._id) === null || _a === void 0 ? void 0 : _a.toString()) === (replyTo === null || replyTo === void 0 ? void 0 : replyTo._id)) {
                usuarioObjetivoId =
                    ((_d = (_c = (_b = comentarioPrincipal.autor) === null || _b === void 0 ? void 0 : _b._id) === null || _c === void 0 ? void 0 : _c.toString) === null || _d === void 0 ? void 0 : _d.call(_c)) || null;
            }
            else {
                // respuesta específica
                const respuestas = Array.isArray(comentarioPrincipal.respuestas)
                    ? comentarioPrincipal.respuestas
                    : [];
                const respuestaObjetivo = respuestas.find((respuesta) => { var _a; return ((_a = respuesta._id) === null || _a === void 0 ? void 0 : _a.toString()) === (replyTo === null || replyTo === void 0 ? void 0 : replyTo._id); });
                usuarioObjetivoId = ((_g = (_f = (_e = respuestaObjetivo === null || respuestaObjetivo === void 0 ? void 0 : respuestaObjetivo.autor) === null || _e === void 0 ? void 0 : _e._id) === null || _f === void 0 ? void 0 : _f.toString) === null || _g === void 0 ? void 0 : _g.call(_f)) || null;
            }
        }
        const usuarioActualId = (_j = (_h = user._id) === null || _h === void 0 ? void 0 : _h.toString) === null || _j === void 0 ? void 0 : _j.call(_h);
        // no notificarse a sí mismo
        if (usuarioObjetivoId &&
            usuarioActualId &&
            usuarioObjetivoId !== usuarioActualId) {
            const nombreRespondedor = [user.nombre, user.apellido]
                .filter(Boolean)
                .join(" ")
                .trim();
            const tituloPublicacion = publicacionActualizada.titulo || "tu publicación";
            try {
                yield (0, notificacion_service_1.createRespuestaComentarioNotificacion)({
                    destinatarioId: usuarioObjetivoId, // temporal
                    recipientes: [usuarioObjetivoId],
                    publicacionId: id,
                    tituloPublicacion,
                    nombreRespondedor: nombreRespondedor,
                });
            }
            catch (notificacionError) {
                console.warn("No se pudo crear notificación:", notificacionError);
            }
        }
        res.status(201).json(publicacionActualizada.comentarios);
    }
    catch (error) {
        console.warn("Error al agregar respuesta:", error);
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.addRespuesta = addRespuesta;
// filtros de búsqueda
const filterPublicaciones = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { texto, tag, autor } = req.query;
        const filtro = { $and: [(0, publicacionExpiration_1.buildActivePublicationQuery)()] };
        let hasSearchCriteria = false;
        if (texto) {
            filtro.$and.push({
                $or: [
                    { titulo: { $regex: texto, $options: "i" } },
                    { contenido: { $regex: texto, $options: "i" } },
                ],
            });
            hasSearchCriteria = true;
        }
        if (tag) {
            filtro.$and.push({
                tag: {
                    $regex: tag,
                    $options: "i",
                },
            });
            hasSearchCriteria = true;
        }
        if (autor) {
            if (!mongoose_1.default.Types.ObjectId.isValid(autor)) {
                res.status(400).json({
                    message: "ID de autor inválido",
                });
                return;
            }
            filtro.$and.push({
                autor,
            });
            hasSearchCriteria = true;
        }
        if (!hasSearchCriteria) {
            res.status(400).json({
                message: "Debe proporcionar al menos un parámetro de búsqueda (texto, tag o autor)",
            });
            return;
        }
        const publicaciones = yield publicacion_model_1.modelPublicacion.find(filtro);
        if (publicaciones.length === 0) {
            res.status(404).json({
                message: "No se encontraron publicaciones con esos criterios",
            });
            return;
        }
        res.status(200).json(publicaciones);
    }
    catch (error) {
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.filterPublicaciones = filterPublicaciones;
// Obtener eventos por rango de fechas
const getEventosPorFecha = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            res.status(400).json({ message: "Se requieren startDate y endDate" });
            return;
        }
        const eventos = yield publicacion_model_1.modelPublicacion
            .find(Object.assign(Object.assign({}, (0, publicacionExpiration_1.buildActivePublicationQuery)()), { tag: "evento", publicado: true, fechaEvento: {
                $gte: startDate,
                $lte: endDate,
            } }))
            .populate("autor", "nombre")
            .populate("categoria", "nombre")
            .select("titulo fechaEvento horaEvento contenido adjunto _id precio moneda monedaSimbolo")
            .sort({ fechaEvento: 1 });
        res.status(200).json(eventos);
    }
    catch (error) {
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.getEventosPorFecha = getEventosPorFecha;
// Búsqueda rápida por título (para sugerencias)
const searchPublicacionesByTitulo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q, limit = 5 } = req.query;
        if (!q || typeof q !== "string" || q.trim() === "") {
            res
                .status(400)
                .json({ message: "El parámetro de búsqueda (q) es requerido" });
            return;
        }
        const searchTerm = q.trim();
        const searchLimit = Math.min(Number(limit), 50); // Máximo 50 resultados
        const publicaciones = yield publicacion_model_1.modelPublicacion
            .find(Object.assign(Object.assign({}, (0, publicacionExpiration_1.buildActivePublicationQuery)()), { publicado: true, titulo: { $regex: searchTerm, $options: "i" } }))
            .populate("autor", "nombre")
            .populate("categoria", "nombre estado")
            .select("titulo tag autor categoria fecha fechaEvento precio moneda monedaSimbolo adjunto")
            .limit(searchLimit)
            .sort({ createdAt: -1 });
        res.status(200).json({
            data: publicaciones,
            searchTerm,
            total: publicaciones.length,
        });
    }
    catch (error) {
        const err = error;
        console.error("Error en búsqueda rápida:", err);
        res.status(500).json({ message: "Error al realizar la búsqueda" });
    }
});
exports.searchPublicacionesByTitulo = searchPublicacionesByTitulo;
// Búsqueda avanzada con filtros
const searchPublicacionesAvanzada = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q, tag, categoria, fechaInicio, fechaFin, offset = 0, limit = 12 } = req.query;
        const query = {
            publicado: true,
            $and: [(0, publicacionExpiration_1.buildActivePublicationQuery)()],
        };
        // Búsqueda por texto en título o contenido
        if (q && typeof q === "string" && q.trim() !== "") {
            query.$and.push({
                $or: [
                    { titulo: { $regex: q.trim(), $options: "i" } },
                    { contenido: { $regex: q.trim(), $options: "i" } },
                ],
            });
        }
        // Filtros adicionales
        if (tag)
            query.tag = tag;
        if (categoria)
            query.categoria = categoria;
        const fechaFiltro = buildFechaFilter(fechaInicio, fechaFin, tag);
        if (fechaFiltro) {
            if ("field" in fechaFiltro) {
                Object.assign(query, fechaFiltro.field);
            }
            else {
                query.$and.push({ $or: fechaFiltro.or });
            }
        }
        const numericOffset = Number(offset);
        const numericLimit = Number(limit);
        const [publicaciones, totalPublicaciones] = yield Promise.all([
            publicacion_model_1.modelPublicacion
                .find(query)
                .populate("autor", "nombre")
                .populate("categoria", "nombre estado")
                .sort({ createdAt: -1 })
                .skip(numericOffset)
                .limit(numericLimit),
            publicacion_model_1.modelPublicacion.countDocuments(query),
        ]);
        res.status(200).json({
            data: publicaciones,
            pagination: {
                offset: numericOffset,
                limit: numericLimit,
                total: totalPublicaciones,
                pages: Math.ceil(totalPublicaciones / Math.max(numericLimit, 1)),
            },
            searchTerm: q,
        });
    }
    catch (error) {
        const err = error;
        console.error("Error en búsqueda avanzada:", err);
        res.status(500).json({ message: "Error al realizar la búsqueda" });
    }
});
exports.searchPublicacionesAvanzada = searchPublicacionesAvanzada;
// Búsqueda específica por título
const searchByTitulo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q, offset = 0, limit = 12 } = req.query;
        if (!q || typeof q !== "string" || q.trim() === "") {
            res
                .status(400)
                .json({ message: "El parámetro de búsqueda (q) es requerido" });
            return;
        }
        const searchTerm = q.trim();
        const queryOffset = Number(offset);
        const queryLimit = Math.min(Number(limit), 50);
        const query = Object.assign(Object.assign({}, (0, publicacionExpiration_1.buildActivePublicationQuery)()), { publicado: true, titulo: { $regex: searchTerm, $options: "i" } });
        const [publicaciones, total] = yield Promise.all([
            publicacion_model_1.modelPublicacion
                .find(query)
                .populate("autor", "nombre")
                .populate("categoria", "nombre estado")
                .sort({ createdAt: -1 })
                .skip(queryOffset)
                .limit(queryLimit),
            publicacion_model_1.modelPublicacion.countDocuments(query),
        ]);
        res.status(200).json({
            data: publicaciones,
            pagination: {
                offset: queryOffset,
                limit: queryLimit,
                total,
                pages: Math.ceil(total / Math.max(queryLimit, 1)),
            },
            searchTerm,
        });
    }
    catch (error) {
        const err = error;
        console.error("Error en búsqueda por título:", err);
        res.status(500).json({ message: "Error al realizar la búsqueda" });
    }
});
exports.searchByTitulo = searchByTitulo;
