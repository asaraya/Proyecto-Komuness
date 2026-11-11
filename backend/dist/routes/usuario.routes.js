"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const usuario_controller_1 = require("../controllers/usuario.controller");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
const router = (0, express_1.Router)();
// Endpoint para recuperar contrasena
router.post("/recuperar-contrasena", usuario_controller_1.enviarCorreoRecuperacion);
// Endpoints de autenticacion
router.post("/login", auth_controller_1.loginUsuario);
router.post("/register", auth_controller_1.registerUsuario);
router.get("/confirmar-cuenta", auth_controller_1.confirmarCuentaUsuario);
router.post("/reenviar-confirmacion", auth_controller_1.reenviarConfirmacionUsuario);
// checkAuth pasa por authMiddleware para usar usuario real+aplicar downgrade
router.get("/check", auth_middleware_1.authMiddleware, usuario_controller_1.checkAuth);
// los siguientes endpoints son de uso exclusivo para el superadmin = 0
router.post("/", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0]), usuario_controller_1.createUsuario);
router.get("/", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1, 2, 3]), usuario_controller_1.getUsuarios);
router.get("/public", auth_middleware_1.authMiddleware, usuario_controller_1.getPublicUsuarios);
router.get("/:id/etiquetas", usuario_controller_1.getTagsByUser);
router.get("/:id", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0]), usuario_controller_1.getUsuarioById);
router.delete("/:id", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0]), usuario_controller_1.deleteUsuario);
// Endpoints para administradores: gestion de limites y premium
router.put("/:id/limite", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), usuario_controller_1.actualizarLimiteUsuario);
router.put("/:id/premium-vencimiento", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), usuario_controller_1.actualizarVencimientoPremium);
// Endpoints de admins/superadmin: cambiar tipoUsuario (ahora 1/2/3) con calculo automatico en premium
router.put("/:id/membresia", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), usuario_controller_1.actualizarMembresiaUsuarioAdmin);
// este endpoint es de uso para cualquier usuario registrado
router.put("/:id", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1, 2, 3]), usuario_controller_1.updateUsuario);
// para cualquier usuario registrado
router.put("/me/premium", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1, 2, 3]), usuario_controller_1.activarPremiumActual);
exports.default = router;
