"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const usuario_model_1 = require("../models/usuario.model");
/**
 * Middleware para verificar el token de autenticación recuperado desde el header Authorization (Bearer)
 * Además aplica downgrade automático si el premium ya venció.
 */
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            res.status(401).json({ message: 'No provee Bearer header' });
            return;
        }
        const token = header.split(' ')[1];
        if (!token) {
            res.status(401).json({ message: 'No provee token' });
            return;
        }
        const status = yield (0, jwt_1.verificarToken)(token);
        if (!status.usuario) {
            if (status.error === 'Token expirado') {
                res.status(401).json({ message: 'Token expirado' });
                return;
            }
            if (status.error === 'Token invalido') {
                res.status(401).json({ message: 'Token invalido' });
                return;
            }
            res.status(401).json({ message: 'No autorizado NULL USER' });
            return;
        }
        //  PASO 3 (A): downgrade automático si el premium ya venció.
        // Importante: NO confiamos en lo que trae el token para tipoUsuario/fechaVencimientoPremium.
        // Siempre leemos el usuario real desde la BD y ahí aplicamos la expiración.
        const tokenUser = status.usuario;
        const loggedUserId = ((_b = (_a = tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser._id) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) ||
            (tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser._id) ||
            (tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser.id) ||
            (tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser.userId);
        if (!loggedUserId) {
            res.status(401).json({ message: 'No autorizado (sin id de usuario)' });
            return;
        }
        //  NO exponer password y ASEGURAR que incluya el campo plan
        const usuarioDb = yield usuario_model_1.modelUsuario.findById(loggedUserId).select('-password');
        if (!usuarioDb) {
            res.status(401).json({ message: 'No autorizado (usuario no existe)' });
            return;
        }
        const ahora = new Date();
        const fecha = usuarioDb.fechaVencimientoPremium ? new Date(usuarioDb.fechaVencimientoPremium) : null;
        const fechaValida = !!fecha && !isNaN(fecha.getTime());
        const premiumVencido = usuarioDb.tipoUsuario === 3 && fechaValida && fecha <= ahora;
        let usuarioFinal = usuarioDb;
        if (premiumVencido) {
            const actualizado = yield usuario_model_1.modelUsuario.findByIdAndUpdate(loggedUserId, { tipoUsuario: 2, fechaVencimientoPremium: null }, { new: true }).select('-password');
            if (actualizado)
                usuarioFinal = actualizado;
        }
        // ✅ Asegurar que el objeto usuario incluya el campo plan (aunque sea null)
        const usuarioParaRequest = Object.assign(Object.assign({}, usuarioFinal.toObject()), { plan: usuarioFinal.plan || null });
        req.user = usuarioParaRequest;
        req.userId = usuarioFinal === null || usuarioFinal === void 0 ? void 0 : usuarioFinal._id;
        next();
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: `Error interno del servidor en al funcion: ${exports.authMiddleware.name}`,
            error: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
});
exports.authMiddleware = authMiddleware;
