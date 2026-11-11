import { Router } from "express";
import {
  createUsuario,
  deleteUsuario,
  getUsuarioById,
  getUsuarios,
  updateUsuario,
  checkAuth,
  enviarCorreoRecuperacion,
  actualizarLimiteUsuario,
  actualizarPermisoCuentaRegresiva,
  actualizarVencimientoPremium,
  actualizarMembresiaUsuarioAdmin,
  activarPremiumActual,
  getTagsByUser,
  getPublicUsuarios
} from "../controllers/usuario.controller";
import {
  loginUsuario,
  registerUsuario,
  confirmarCuentaUsuario,
  reenviarConfirmacionUsuario
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { verificarRoles } from "../middlewares/roles.middleware";

const router = Router();

// Endpoint para recuperar contrasena
router.post("/recuperar-contrasena", enviarCorreoRecuperacion);

// Endpoints de autenticacion
router.post("/login", loginUsuario);
router.post("/register", registerUsuario);
router.get("/confirmar-cuenta", confirmarCuentaUsuario);
router.post("/reenviar-confirmacion", reenviarConfirmacionUsuario);

// checkAuth pasa por authMiddleware para usar usuario real+aplicar downgrade
router.get("/check", authMiddleware, checkAuth);

// los siguientes endpoints son de uso exclusivo para el superadmin = 0
router.post("/", authMiddleware, verificarRoles([0]), createUsuario);
router.get("/", authMiddleware, verificarRoles([0, 1, 2, 3]), getUsuarios);
router.get("/public", authMiddleware, getPublicUsuarios);

router.get("/:id/etiquetas", getTagsByUser);
router.get("/:id", authMiddleware, verificarRoles([0]), getUsuarioById);

router.delete("/:id", authMiddleware, verificarRoles([0]), deleteUsuario);

// Endpoints para administradores: gestion de limites y premium
router.put("/:id/limite", authMiddleware, verificarRoles([0, 1]), actualizarLimiteUsuario);
router.put("/:id/cuenta-regresiva", authMiddleware, verificarRoles([0, 1]), actualizarPermisoCuentaRegresiva);
router.put("/:id/premium-vencimiento", authMiddleware, verificarRoles([0, 1]), actualizarVencimientoPremium);

// Endpoints de admins/superadmin: cambiar tipoUsuario (ahora 1/2/3) con calculo automatico en premium
router.put("/:id/membresia", authMiddleware, verificarRoles([0, 1]), actualizarMembresiaUsuarioAdmin);

// este endpoint es de uso para cualquier usuario registrado
router.put("/:id", authMiddleware, verificarRoles([0, 1, 2, 3]), updateUsuario);

// para cualquier usuario registrado
router.put(
  "/me/premium",
  authMiddleware,
  verificarRoles([0, 1, 2, 3]),
  activarPremiumActual
);

export default router;
