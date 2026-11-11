import { Router } from 'express';
import { 
  obtenerProfesionales, 
  toggleBancoProfesionales, 
  quitarDelBanco,
  obtenerEstadoBanco,
  esProfesional
} from '../controllers/bancoProfesionales.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { verificarRoles } from '../middlewares/roles.middleware';

const router = Router();

// Ruta pública - obtener listado de profesionales y ver si el usuario actual es profesional
router.get('/', obtenerProfesionales);
router.get('/es-profesional/:id', esProfesional);

// Rutas protegidas
router.get('/estado', authMiddleware, obtenerEstadoBanco);
router.put('/toggle', authMiddleware, toggleBancoProfesionales);

// Ruta solo para administradores
router.put('/:id/quitar', authMiddleware, verificarRoles([0, 1]), quitarDelBanco);

export default router;
