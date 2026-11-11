"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const express_1 = require("express");
const publicacion_controller_1 = require("../controllers/publicacion.controller");
const publicacion_update_controller_1 = require("../controllers/publicacion-update.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const limitePublicaciones_middleware_1 = require("../middlewares/limitePublicaciones.middleware");
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});
// acepta 'archivos' o 'imagenes' (0..N)
const multiFields = upload.fields([
    { name: 'archivos', maxCount: 10 },
    { name: 'imagenes', maxCount: 10 },
]);
const router = (0, express_1.Router)();
// ========== RUTAS PÚBLICAS ==========
router.get('/', publicacion_controller_1.getPublicacionesByTag);
router.get('/buscar', publicacion_controller_1.filterPublicaciones);
router.get('/:id', publicacion_controller_1.getPublicacionById);
router.get('/categoria/:categoriaId', publicacion_controller_1.getPublicacionesByCategoria);
router.get('/eventos/calendario', publicacion_controller_1.getEventosPorFecha);
// ========== RUTAS DE USUARIO AUTENTICADO ==========
router.post('/', auth_middleware_1.authMiddleware, limitePublicaciones_middleware_1.validarLimitePublicaciones, publicacion_controller_1.createPublicacion);
// Handler robusto para capturar errores de Multer
router.post('/v2', auth_middleware_1.authMiddleware, limitePublicaciones_middleware_1.validarLimitePublicaciones, (req, res, next) => {
    multiFields(req, res, (err) => {
        if (err) {
            const msg = (err === null || err === void 0 ? void 0 : err.message) || 'Error al subir archivos';
            const status = (err === null || err === void 0 ? void 0 : err.code) === 'LIMIT_FILE_SIZE' ? 413 : 400;
            return res.status(status).json({ ok: false, message: msg });
        }
        (0, publicacion_controller_1.createPublicacionA)(req, res).catch(next);
    });
});
router.post('/:id/comentarios', auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1, 2, 3]), publicacion_controller_1.addComentario);
router.post('/:id/comentarios/:comentarioId/respuesta', auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1, 2, 3]), publicacion_controller_1.addRespuesta);
// ========== RUTAS DE EDICIÓN PARA AUTORES ==========
// Ruta  para solicitar actualización
router.put('/:id/request-update', auth_middleware_1.authMiddleware, multiFields, publicacion_update_controller_1.requestUpdatePublicacion);
router.delete('/:id/cancel-update', auth_middleware_1.authMiddleware, publicacion_update_controller_1.cancelUpdateRequest);
router.put('/:id/request-update', auth_middleware_1.authMiddleware, multiFields, publicacion_update_controller_1.requestUpdatePublicacion);
// ========== RUTAS DE ADMINISTRACIÓN ==========
// NOTA: Estas rutas deben definirse ANTES de las rutas con parámetros genéricos como '/:id'
router.get('/admin/pending-updates', auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), publicacion_update_controller_1.getPendingUpdates);
router.put('/admin/:id/approve-update', auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), publicacion_update_controller_1.approveUpdate);
router.put('/admin/:id/reject-update', auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), publicacion_update_controller_1.rejectUpdate);
// ========== RUTAS DE ADMINISTRACIÓN GENERAL ==========
router.put('/:id', auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), publicacion_controller_1.updatePublicacion);
router.delete('/:id', auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), publicacion_controller_1.deletePublicacion);
exports.default = router;
// ========== RUTAS DE BÚSQUEDA ==========
router.get('/search/quick', publicacion_controller_1.searchPublicacionesByTitulo); // Búsqueda rápida
router.get('/search/advanced', publicacion_controller_1.searchPublicacionesAvanzada); // Búsqueda con filtros
router.get('/search/titulo', publicacion_controller_1.searchByTitulo);
