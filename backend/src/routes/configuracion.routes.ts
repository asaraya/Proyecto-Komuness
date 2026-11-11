import { Router } from 'express';
import {
    getConfiguraciones,
    getConfiguracionPorClave,
    actualizarConfiguracion,
    actualizarLimitesPublicaciones,
    getMisLimitesPublicaciones,
    deleteConfiguracion,
    actualizarConfiguracionPagos,
    getConfiguracionPagos,
    getFraseInicioPublica,
    actualizarFraseInicio,
    getContenidoInicioPublico,
    actualizarContenidoInicio,
    getTematicaPublica,
    getTematicaAdmin,
    actualizarTematica,
    subirImagenFondoTematica,
    getImagenFondoTematica
} from '../controllers/configuracion.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { verificarRoles } from '../middlewares/roles.middleware';
import { uploadThemeBackground } from '../middlewares/multer.middleware';
import { secureUploads } from '../utils/uploadSecurity';

const router = Router();

// IMPORTANTE: rutas específicas primero, rutas dinámicas después
router.get('/frase-inicio', getFraseInicioPublica);
router.put('/frase-inicio', authMiddleware, verificarRoles([0, 1]), actualizarFraseInicio);
router.get('/inicio-contenido', getContenidoInicioPublico);
router.put('/inicio-contenido', authMiddleware, verificarRoles([0, 1]), actualizarContenidoInicio);

router.get('/tematica', getTematicaPublica);
router.get('/tematica/admin', authMiddleware, verificarRoles([0, 1]), getTematicaAdmin);
router.put('/tematica', authMiddleware, verificarRoles([0, 1]), actualizarTematica);
router.post('/tematica/background', authMiddleware, verificarRoles([0, 1]), uploadThemeBackground.single('image'), secureUploads('images'), subirImagenFondoTematica);
router.get('/tematica/background/:fileName', getImagenFondoTematica);

router.get('/pagos', authMiddleware, getConfiguracionPagos);
router.put('/pagos', authMiddleware, verificarRoles([0, 1]), actualizarConfiguracionPagos);

// Endpoint para que cualquier usuario autenticado vea sus límites
router.get('/mis-limites', authMiddleware, getMisLimitesPublicaciones);

// Endpoints para administradores (super-admin y admin)
router.get('/', authMiddleware, verificarRoles([0, 1]), getConfiguraciones);
router.put('/limites-publicaciones', authMiddleware, verificarRoles([0, 1]), actualizarLimitesPublicaciones);
router.put('/', authMiddleware, verificarRoles([0, 1]), actualizarConfiguracion);

// Rutas con parámetros DEBEN ir al final
router.get('/:clave', authMiddleware, verificarRoles([0, 1]), getConfiguracionPorClave);
router.delete('/:clave', authMiddleware, verificarRoles([0]), deleteConfiguracion);

export default router;
