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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activarPremiumActual = exports.actualizarMembresiaUsuarioAdmin = exports.actualizarVencimientoPremium = exports.actualizarLimiteUsuario = exports.checkAuth = exports.registerUsuario = exports.loginUsuario = exports.deleteUsuario = exports.updateUsuario = exports.getTagsByUser = exports.getUsuarioById = exports.getPublicUsuarios = exports.getUsuarios = exports.createUsuario = void 0;
exports.enviarCorreoRecuperacion = enviarCorreoRecuperacion;
const usuario_model_1 = require("../models/usuario.model");
const jwt_1 = require("../utils/jwt");
const bcryptjs_1 = require("../utils/bcryptjs");
const nodemailer_1 = require("nodemailer");
const encuestaInicio_1 = require("../utils/encuestaInicio");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Controlador para crear un usuario
const createUsuario = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const usuario = req.body;
        const user = new usuario_model_1.modelUsuario(usuario);
        const saveuser = yield user.save();
        res.status(201).json(saveuser);
    }
    catch (error) {
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.createUsuario = createUsuario;
// Controlador para obtener todos los usuarios
const getUsuarios = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tipoUsuario } = req.query;
    const query = {};
    if (tipoUsuario) {
        const tipos = String(tipoUsuario).split(',').map(Number);
        if (tipos.some(isNaN)) {
            res.status(400).json({
                success: false,
                message: 'tipoUsuario debe contener números separados por comas'
            });
            return;
        }
        query.tipoUsuario = { $in: tipos };
    }
    try {
        // INCLUIR plan en la selección
        const usuarios = yield usuario_model_1.modelUsuario.find(query).select('-password');
        // Transformar la respuesta para incluir plan explícitamente
        const usuariosConPlan = usuarios.map(usuario => (Object.assign(Object.assign({}, usuario.toObject()), { plan: usuario.plan || null // Asegurar que siempre haya un campo plan
         })));
        res.status(200).json({
            success: true,
            data: usuariosConPlan
        });
    }
    catch (error) {
        const err = error;
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.getUsuarios = getUsuarios;
// Controlador para obtener todos los usuarios
const getPublicUsuarios = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const usuarios = yield usuario_model_1.modelUsuario.find().select('nombre apellido');
        res.status(200).json({
            success: true,
            data: usuarios
        });
    }
    catch (error) {
        const err = error;
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.getPublicUsuarios = getPublicUsuarios;
// Controlador para obtener un usuario por su id
const getUsuarioById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        // INCLUIR plan en la consulta
        const usuario = yield usuario_model_1.modelUsuario.findById(id).select('-password');
        if (!usuario) {
            res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: Object.assign(Object.assign({}, usuario.toObject()), { plan: usuario.plan || null })
        });
    }
    catch (error) {
        const err = error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});
exports.getUsuarioById = getUsuarioById;
// Controlador para obtener etiquetas
const getTagsByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const id = req.params.id;
        // INCLUIR plan en la consulta
        const usuario = yield usuario_model_1.modelUsuario.findById(id)
            .select("encuestaInicio.etiquetas")
            .populate("encuestaInicio.etiquetas")
            .lean();
        const etiquetas = (_b = (_a = usuario === null || usuario === void 0 ? void 0 : usuario.encuestaInicio) === null || _a === void 0 ? void 0 : _a.etiquetas) !== null && _b !== void 0 ? _b : [];
        if (!usuario) {
            res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
            return;
        }
        res.status(200).json({
            message: "Etiquetas obtenidas correctamente",
            data: etiquetas
        });
    }
    catch (error) {
        const err = error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});
exports.getTagsByUser = getTagsByUser;
// Controlador para actualizar un usuario
const updateUsuario = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const usuario = req.body;
        // If password is included in the update, hash it before saving
        if (usuario.password) {
            usuario.password = yield (0, bcryptjs_1.hashPassword)(usuario.password);
        }
        if (req.body.encuestaInicio !== undefined) {
            usuario.encuestaInicio = (0, encuestaInicio_1.normalizeEncuestaInicio)(req.body.encuestaInicio);
        }
        const user = yield usuario_model_1.modelUsuario.findByIdAndUpdate(id, usuario, { new: true }).select('-password');
        res.status(200).json(user);
    }
    catch (error) {
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.updateUsuario = updateUsuario;
// Controlador para eliminar un usuario
const deleteUsuario = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        yield usuario_model_1.modelUsuario.findByIdAndDelete(id);
        res.status(200).json({ message: 'Usuario eliminado' });
    }
    catch (error) {
        const err = error;
        res.status(500).json({ message: err.message });
    }
});
exports.deleteUsuario = deleteUsuario;
/**
 *
 * loginUsuario: realiza el login de un usuario y devuelve un token
 * @param req: Request
 * @param res: Response
 * @returns: void
 */
const loginUsuario = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        //buscamos el usuario en la base de datos
        let usuario = yield usuario_model_1.modelUsuario.findOne({ email });
        if (!usuario) {
            res.status(401).json({ message: 'Usuario no encontrado' });
            return;
        }
        //comparamos la contraseña   
        const isPasswordValid = yield (0, bcryptjs_1.comparePassword)(password, usuario.password);
        if (!isPasswordValid) {
            res.status(401).json({ message: 'Contraseña incorrecta' });
            return;
        }
        // ✅ PASO 3 (A): si el usuario tiene premium vencido, lo bajamos antes de generar token/retornar user
        const ahora = new Date();
        const fecha = usuario.fechaVencimientoPremium ? new Date(usuario.fechaVencimientoPremium) : null;
        const fechaValida = !!fecha && !isNaN(fecha.getTime());
        const premiumVencido = usuario.tipoUsuario === 3 && fechaValida && fecha <= ahora;
        if (premiumVencido) {
            const actualizado = yield usuario_model_1.modelUsuario.findByIdAndUpdate(usuario._id, { tipoUsuario: 2 }, { new: true });
            if (actualizado)
                usuario = actualizado;
        }
        //si es exitoso, generamos un token y lo devolvemos en la cookie
        const token = (0, jwt_1.generarToken)(usuario);
        //  Incluir plan en la respuesta
        res.status(200).json({
            token,
            message: 'Login exitoso',
            user: Object.assign(Object.assign({}, usuario.toObject()), { plan: usuario.plan || null })
        });
    }
    catch (error) {
        const err = error;
        console.log(err);
        res.status(500).json({ message: err.message });
    }
});
exports.loginUsuario = loginUsuario;
/**
 *
 * registerUsuario: registra un usuario en la base de datos
 * @param req: Request
 * @param res: Response
 * @returns: void
 */
const registerUsuario = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nombre, apellido, email, password, tipoUsuario, codigo } = req.body;
    try {
        //verificamos si el usuario ya existe
        const usuario = yield usuario_model_1.modelUsuario.findOne({ email });
        if (usuario) {
            res.status(400).json({ message: 'Usuario ya existe' });
            return;
        }
        //si no existe, lo creamos
        const hashedPassword = yield (0, bcryptjs_1.hashPassword)(password);
        const newUsuario = new usuario_model_1.modelUsuario({
            nombre,
            apellido,
            email,
            password: hashedPassword,
            tipoUsuario,
            codigo
        });
        yield newUsuario.save();
        res.status(201).json({ message: 'Usuario creado', user: newUsuario });
    }
    catch (error) {
        const err = error;
        console.log(err);
        res.status(500).json({ message: err.message });
    }
});
exports.registerUsuario = registerUsuario;
/**
 * checkAuth: verifica si el usuario esta autenticado en la aplicacion
 * @param req: Request
 * @param res: Response
 * @returns: void
 */
const checkAuth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        // Si la ruta pasó por authMiddleware, ya viene el usuario real (con downgrade aplicado)
        const authReq = req;
        if (authReq.user) {
            // Asegurar que el usuario tenga el campo plan y no incluya password
            const userWithPlan = Object.assign(Object.assign({}, authReq.user.toObject ? authReq.user.toObject() : authReq.user), { plan: authReq.user.plan || null });
            // Eliminar password si existe
            if (userWithPlan.password) {
                delete userWithPlan.password;
            }
            res.status(200).json({
                success: true,
                message: 'Autorizado',
                user: userWithPlan
            });
            return;
        }
        // Fallback: si por alguna razón llaman checkAuth sin middleware, hacemos la validación aquí
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'No provee Bearer header'
            });
            return;
        }
        const token = header.split(' ')[1];
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'No provee token'
            });
            return;
        }
        //verificamos el token
        const status = yield (0, jwt_1.verificarToken)(token);
        if (!status.usuario) {
            if (status.error === "Token expirado") {
                res.status(401).json({
                    success: false,
                    message: 'Token expirado'
                });
                return;
            }
            if (status.error === "Token invalido") {
                res.status(403).json({
                    success: false,
                    message: 'Token invalido'
                });
                return;
            }
            res.status(401).json({
                success: false,
                message: 'No autorizado'
            });
            return;
        }
        //  PASO 3 (A): usar BD y aplicar downgrade si venció
        const tokenUser = status.usuario;
        const loggedUserId = ((_b = (_a = tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser._id) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) ||
            (tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser._id) ||
            (tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser.id) ||
            (tokenUser === null || tokenUser === void 0 ? void 0 : tokenUser.userId);
        if (!loggedUserId) {
            res.status(401).json({
                success: false,
                message: 'No autorizado (sin id de usuario)'
            });
            return;
        }
        //  No traer password y asegurar campo plan
        const usuarioDb = yield usuario_model_1.modelUsuario.findById(loggedUserId).select('-password');
        if (!usuarioDb) {
            res.status(401).json({
                success: false,
                message: 'No autorizado (usuario no existe)'
            });
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
        //  Incluir plan en la respuesta y asegurar formato consistente
        const usuarioResponse = Object.assign(Object.assign({}, usuarioFinal.toObject()), { plan: usuarioFinal.plan || null, _id: ((_c = usuarioFinal._id) === null || _c === void 0 ? void 0 : _c.toString()) || usuarioFinal._id });
        res.status(200).json({
            success: true,
            message: 'Autorizado',
            user: usuarioResponse
        });
    }
    catch (error) {
        const err = error;
        console.error(`Error en ${exports.checkAuth.name}:`, err);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});
exports.checkAuth = checkAuth;
function enviarCorreoRecuperacion(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { email } = req.body;
        // setup del transporter de nodemailer para enviar correos
        const transporter = (0, nodemailer_1.createTransport)({
            service: 'gmail',
            //host: 'smtp.zoho.com',
            //port: 2525,
            //secure: false,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        // Generar una nueva contraseña aleatoria
        const newPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = yield (0, bcryptjs_1.hashPassword)(newPassword);
        // opciones del correo electrónico con la nueva contraseña
        const mailOptions = {
            from: `"Komuness" <${process.env.MAIL_USER}>`,
            to: email,
            subject: 'Recuperación de contraseña',
            html: `
            <p>Has solicitado restablecer tu contraseña.</p>
            <p>La nueva contraseña para el ingreso a su cuenta será:</p>
            <p>${newPassword}</p>
        `
        };
        // Enviar el correo electrónico y actualizar la contraseña en la base de datos
        try {
            const usuario = yield usuario_model_1.modelUsuario.findOne({ email });
            if (!usuario) {
                res.status(404).json({ message: 'Usuario no encontrado' });
                throw new Error('Usuario no encontrado');
            }
            else {
                yield transporter.sendMail(mailOptions);
                yield usuario_model_1.modelUsuario.findOneAndUpdate({ email }, { password: hashedPassword });
                res.status(200).json({ message: 'Correo electrónico enviado con éxito' });
            }
        }
        catch (error) {
            console.error('Error al enviar el correo electrónico:', error);
        }
    });
}
/**
 * Actualizar límite personalizado de publicaciones para un usuario específico (solo admins)
 */
const actualizarLimiteUsuario = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { limitePublicaciones } = req.body;
        if (limitePublicaciones !== undefined && limitePublicaciones !== null) {
            if (typeof limitePublicaciones !== 'number' || limitePublicaciones < 0) {
                res.status(400).json({
                    success: false,
                    message: 'limitePublicaciones debe ser un número mayor o igual a 0'
                });
                return;
            }
        }
        const usuario = yield usuario_model_1.modelUsuario.findByIdAndUpdate(id, { limitePublicaciones }, { new: true }).select('-password');
        if (!usuario) {
            res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Límite personalizado actualizado correctamente',
            data: usuario
        });
    }
    catch (error) {
        const err = error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});
exports.actualizarLimiteUsuario = actualizarLimiteUsuario;
/**
 * Actualizar fecha de vencimiento premium para un usuario (solo admins)
 */
const actualizarVencimientoPremium = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { fechaVencimientoPremium } = req.body;
        if (!fechaVencimientoPremium) {
            res.status(400).json({
                success: false,
                message: 'Se requiere la fecha de vencimiento'
            });
            return;
        }
        const usuario = yield usuario_model_1.modelUsuario.findByIdAndUpdate(id, {
            fechaVencimientoPremium: new Date(fechaVencimientoPremium),
            tipoUsuario: 3 // Asegurar que sea premium
        }, { new: true }).select('-password');
        if (!usuario) {
            res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Fecha de vencimiento premium actualizada correctamente',
            data: usuario
        });
    }
    catch (error) {
        const err = error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});
exports.actualizarVencimientoPremium = actualizarVencimientoPremium;
/**
 * ✅ CAMBIO CLAVE:
 * Admin/Superadmin: Cambiar tipoUsuario a 1,2,3
 * - 1=admin (limpia premium)
 * - 2=básico (limpia premium)
 * - 3=premium (requiere plan mensual/anual o default mensual; calcula vencimiento 30/365)
 *
 * Seguridad:
 * - Un admin (1) NO puede modificar a otro admin (1) ni al superadmin (0).
 * - Solo el superadmin (0) puede modificar admins o al superadmin.
 */
const actualizarMembresiaUsuarioAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { tipoUsuario, plan } = req.body;
        const authReq = req;
        const actorTipoUsuario = Number((_a = authReq === null || authReq === void 0 ? void 0 : authReq.user) === null || _a === void 0 ? void 0 : _a.tipoUsuario);
        const tipo = Number(tipoUsuario);
        if (![1, 2, 3].includes(tipo)) {
            res.status(400).json({
                success: false,
                message: 'tipoUsuario debe ser 1 (admin), 2 (básico) o 3 (premium)'
            });
            return;
        }
        const usuarioActual = yield usuario_model_1.modelUsuario.findById(id).select('-password');
        if (!usuarioActual) {
            res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            return;
        }
        // ✅ Protecciones por rol:
        // Si target es superadmin (0), solo superadmin puede tocarlo
        if (usuarioActual.tipoUsuario === 0 && actorTipoUsuario !== 0) {
            res.status(403).json({
                success: false,
                message: 'No autorizado: solo el superadmin puede modificar a otro superadmin'
            });
            return;
        }
        // Si actor es admin (1), no puede tocar admins/superadmin
        if (actorTipoUsuario === 1 && (usuarioActual.tipoUsuario === 0 || usuarioActual.tipoUsuario === 1)) {
            res.status(403).json({
                success: false,
                message: 'No autorizado: un admin no puede modificar a otro admin/superadmin'
            });
            return;
        }
        // Helpers
        const limpiarPremium = {
            plan: null,
            fechaVencimientoPremium: null
        };
        // ✅ Pasar a ADMIN
        if (tipo === 1) {
            const actualizado = yield usuario_model_1.modelUsuario.findByIdAndUpdate(id, Object.assign({ tipoUsuario: 1 }, limpiarPremium), { new: true }).select('-password');
            res.status(200).json({
                success: true,
                message: 'Usuario actualizado a Admin',
                data: actualizado
            });
            return;
        }
        // ✅ Pasar a BÁSICO
        if (tipo === 2) {
            const actualizado = yield usuario_model_1.modelUsuario.findByIdAndUpdate(id, Object.assign({ tipoUsuario: 2 }, limpiarPremium), { new: true }).select('-password');
            res.status(200).json({
                success: true,
                message: 'Usuario actualizado a Básico',
                data: actualizado
            });
            return;
        }
        // ✅ Pasar a PREMIUM + calcular vencimiento
        const rawPlan = String(plan || 'mensual').toLowerCase().trim();
        const planOk = rawPlan === 'anual' ? 'anual' : 'mensual';
        const dias = planOk === 'anual' ? 365 : 30;
        const ahora = new Date();
        const fechaExistente = usuarioActual.fechaVencimientoPremium ? new Date(usuarioActual.fechaVencimientoPremium) : null;
        const base = (fechaExistente && !isNaN(fechaExistente.getTime()) && fechaExistente > ahora)
            ? fechaExistente
            : ahora;
        const nuevaFechaVencimientoPremium = new Date(base);
        nuevaFechaVencimientoPremium.setDate(nuevaFechaVencimientoPremium.getDate() + dias);
        const actualizado = yield usuario_model_1.modelUsuario.findByIdAndUpdate(id, {
            tipoUsuario: 3,
            plan: planOk,
            fechaVencimientoPremium: nuevaFechaVencimientoPremium
        }, { new: true }).select('-password');
        res.status(200).json({
            success: true,
            message: 'Usuario actualizado a Premium',
            plan: planOk,
            fechaVencimientoPremium: actualizado === null || actualizado === void 0 ? void 0 : actualizado.fechaVencimientoPremium,
            data: actualizado
        });
    }
    catch (error) {
        const err = error;
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.actualizarMembresiaUsuarioAdmin = actualizarMembresiaUsuarioAdmin;
// Activar premium para el usuario actualmente autenticado
const activarPremiumActual = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const authReq = req;
        const loggedUserId = ((_c = (_b = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString) === null || _c === void 0 ? void 0 : _c.call(_b)) ||
            ((_d = authReq.user) === null || _d === void 0 ? void 0 : _d._id) ||
            authReq.userId ||
            ((_e = authReq.user) === null || _e === void 0 ? void 0 : _e.id);
        if (!loggedUserId) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
            });
            return;
        }
        // PASO 3: cálculo automático de vencimiento (30 días mensual, 365 días anual)
        const rawPlan = String(((_f = req.body) === null || _f === void 0 ? void 0 : _f.plan) || 'mensual').toLowerCase().trim();
        const plan = rawPlan === 'anual' ? 'anual' : 'mensual';
        const dias = plan === 'anual' ? 365 : 30;
        // Si ya tenía vencimiento vigente, extendemos desde esa fecha; si no, desde hoy
        const usuarioActual = yield usuario_model_1.modelUsuario.findById(loggedUserId).select('fechaVencimientoPremium');
        if (!usuarioActual) {
            res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
            return;
        }
        const ahora = new Date();
        const fechaExistente = usuarioActual.fechaVencimientoPremium ? new Date(usuarioActual.fechaVencimientoPremium) : null;
        const base = (fechaExistente && !isNaN(fechaExistente.getTime()) && fechaExistente > ahora) ? fechaExistente : ahora;
        const nuevaFechaVencimientoPremium = new Date(base);
        nuevaFechaVencimientoPremium.setDate(nuevaFechaVencimientoPremium.getDate() + dias);
        const usuario = yield usuario_model_1.modelUsuario.findByIdAndUpdate(loggedUserId, { tipoUsuario: 3, plan, fechaVencimientoPremium: nuevaFechaVencimientoPremium }, { new: true }).select('-password');
        if (!usuario) {
            res.status(404).json({
                success: false,
                message: 'Usuario no encontrado',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Usuario actualizado a Premium',
            plan,
            fechaVencimientoPremium: usuario.fechaVencimientoPremium,
            data: usuario,
        });
    }
    catch (error) {
        const err = error;
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});
exports.activarPremiumActual = activarPremiumActual;
