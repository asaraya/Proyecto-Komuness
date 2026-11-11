
import { Router } from 'express';
import {
  createPublicacion,
  getPublicacionById,
  updatePublicacion,
  deletePublicacion,
  addComentario,
  addRespuesta,
  getPublicacionesByTag,
  filterPublicaciones,
  createPublicacionA,
  getPublicacionesByCategoria,
  getEventosPorFecha,
  searchPublicacionesByTitulo,
  searchPublicacionesAvanzada,
  searchByTitulo,
  contarPublicacionesPorUbicacion,
  addFotosEmprendimiento,
  deleteFotoEmprendimiento,
} from '../controllers/publicacion.controller';

import {
  requestUpdatePublicacion,
  getPendingUpdates,
  approveUpdate,
  rejectUpdate,
  cancelUpdateRequest,
} from '../controllers/publicacion-update.controller';

import { authMiddleware } from '../middlewares/auth.middleware';
import { verificarRoles } from '../middlewares/roles.middleware';
import { validarLimitePublicaciones } from '../middlewares/limitePublicaciones.middleware';
import { uploadImageMemory } from '../utils/imageUpload';
import { secureUploads } from '../utils/uploadSecurity';

const multiFields = uploadImageMemory.fields([
  { name: 'archivos', maxCount: 10 },
  { name: 'imagenes', maxCount: 10 },
]);

const router = Router();

// ========== RUTAS PÚBLICAS ==========
router.get('/', getPublicacionesByTag);
router.get('/buscar', filterPublicaciones);

// Las rutas específicas deben declararse antes de '/:id'.
router.get('/search/quick', searchPublicacionesByTitulo);
router.get('/search/advanced', searchPublicacionesAvanzada);
router.get('/search/titulo', searchByTitulo);

router.get('/conteo/ubicacion', contarPublicacionesPorUbicacion);
router.get('/categoria/:categoriaId', getPublicacionesByCategoria);
router.get('/eventos/calendario', getEventosPorFecha);

// ========== RUTAS DE ADMINISTRACIÓN DE ACTUALIZACIONES ==========
router.get(
  '/admin/pending-updates',
  authMiddleware,
  verificarRoles([0, 1]),
  getPendingUpdates
);

router.put(
  '/admin/:id/approve-update',
  authMiddleware,
  verificarRoles([0, 1]),
  approveUpdate
);

router.put(
  '/admin/:id/reject-update',
  authMiddleware,
  verificarRoles([0, 1]),
  rejectUpdate
);

// Ruta genérica de consulta después de las rutas específicas.
router.get('/:id', getPublicacionById);

// ========== RUTAS DE USUARIO AUTENTICADO ==========
router.post(
  '/',
  authMiddleware,
  validarLimitePublicaciones,
  createPublicacion
);

// Crear publicación con imágenes.
router.post(
  '/v2',
  authMiddleware,
  validarLimitePublicaciones,
  (req, res, next) => {
    multiFields(req, res, (err: any) => {
      if (err) {
        const status = err?.code === 'LIMIT_FILE_SIZE' ? 413 : 400;

        return res.status(status).json({
          ok: false,
          message: err?.message || 'Error al subir archivos',
        });
      }

      secureUploads('images')(req, res, () => {
        createPublicacionA(req, res).catch(next);
      });
    });
  }
);

// Agregar fotos a un emprendimiento existente.
router.post('/:id/fotos', authMiddleware, (req, res, next) => {
  multiFields(req, res, (err: any) => {
    if (err) {
      const status = err?.code === 'LIMIT_FILE_SIZE' ? 413 : 400;

      return res.status(status).json({
        ok: false,
        message: err?.message || 'Error al subir archivos',
      });
    }

    secureUploads('images')(req, res, () => {
      addFotosEmprendimiento(req, res).catch(next);
    });
  });
});

// Eliminar una foto de un emprendimiento.
router.delete('/:id/fotos/:fotoId', authMiddleware, deleteFotoEmprendimiento);

// ========== COMENTARIOS Y RESPUESTAS ==========
router.post(
  '/:id/comentarios',
  authMiddleware,
  verificarRoles([0, 1, 2, 3]),
  addComentario
);

router.post(
  '/:id/comentarios/:comentarioId/respuesta',
  authMiddleware,
  verificarRoles([0, 1, 2, 3]),
  addRespuesta
);

// ========== SOLICITUDES DE ACTUALIZACIÓN ==========
router.put(
  '/:id/request-update',
  authMiddleware,
  multiFields,
  secureUploads('images'),
  requestUpdatePublicacion
);

router.delete('/:id/cancel-update', authMiddleware, cancelUpdateRequest);

// ========== ADMINISTRACIÓN GENERAL ==========
router.put('/:id', authMiddleware, verificarRoles([0, 1]), updatePublicacion);
router.delete('/:id', authMiddleware, verificarRoles([0, 1]), deletePublicacion);

export default router;
