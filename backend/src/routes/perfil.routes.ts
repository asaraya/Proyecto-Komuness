import { Router } from 'express';
import { 
  obtenerPerfilPublico, 
  obtenerMiPerfil,
  validacionParaBanco,
  crearOActualizarPerfil,
  subirFotoPerfil,
  subirCV,
  eliminarCV,
  actualizarCorreoPrincipal
} from '../controllers/perfil.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadFotoPerfil, uploadCV } from '../middlewares/multer.middleware';
import { secureUploads } from '../utils/uploadSecurity';

const router = Router();

// Rutas públicas
router.get('/:id', obtenerPerfilPublico); // Obtener perfil público

// Rutas protegidas (requieren autenticación)
router.get('/usuario/me', authMiddleware, obtenerMiPerfil); // Obtener mi perfil
router.get('/usuario/elegibilidad-banco', authMiddleware, validacionParaBanco);
router.post('/', authMiddleware, crearOActualizarPerfil); // Crear/actualizar perfil
router.put('/foto', authMiddleware, uploadFotoPerfil.single('foto'), secureUploads('images'), subirFotoPerfil); // Subir foto
router.put('/cv', authMiddleware, uploadCV.single('cv'), secureUploads('pdf'), subirCV); // Subir CV
router.delete('/cv', authMiddleware, eliminarCV); // Eliminar CV
router.put('/correo-principal', authMiddleware, actualizarCorreoPrincipal); // Actualizar correo

export default router;
