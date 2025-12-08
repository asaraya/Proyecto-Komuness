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
      
} from '../controllers/configuracion.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { verificarRoles } from '../middlewares/roles.middleware';

const router = Router();

// IMPORTANTE: Rutas específicas primero, rutas dinámicas después
router.get('/pagos', authMiddleware, getConfiguracionPagos); 
router.put('/pagos', authMiddleware, verificarRoles([0, 1]), actualizarConfiguracionPagos);

// Endpoint público para que cualquier usuario autenticado vea sus límites
router.get('/mis-limites', authMiddleware, getMisLimitesPublicaciones);

// Endpoints para administradores (super-admin y admin)
router.get('/', authMiddleware, verificarRoles([0, 1]), getConfiguraciones);

// Endpoint específico para actualizar límites de publicaciones
router.put('/limites-publicaciones', authMiddleware, verificarRoles([0, 1]), actualizarLimitesPublicaciones);

// Endpoint genérico para actualizar cualquier configuración
router.put('/', authMiddleware, verificarRoles([0, 1]), actualizarConfiguracion);

// Rutas con parámetros DEBEN IR AL FINAL
router.get('/:clave', authMiddleware, verificarRoles([0, 1]), getConfiguracionPorClave);

// Solo super-admin puede eliminar configuraciones
router.delete('/:clave', authMiddleware, verificarRoles([0]), deleteConfiguracion);


router.get('/pagos', (req, res, next) => {
   
    next();
}, authMiddleware, verificarRoles([0, 1]), getConfiguracionPagos);

router.put('/pagos', (req, res, next) => {
    
    next();
}, authMiddleware, verificarRoles([0, 1]), actualizarConfiguracionPagos);

export default router;
