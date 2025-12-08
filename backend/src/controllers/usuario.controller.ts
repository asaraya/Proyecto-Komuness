import { Request, Response } from 'express';
import { IUsuario, IUsuario as Usuario } from '../interfaces/usuario.interface';
import { modelUsuario } from '../models/usuario.model';
import { generarToken, verificarToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/bcryptjs';
import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Controlador para crear un usuario
export const createUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const usuario: Usuario = req.body;
        const user = new modelUsuario(usuario);
        const saveuser = await user.save();
        res.status(201).json(saveuser);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ message: err.message });
    }
};

// Controlador para obtener todos los usuarios
export const getUsuarios = async (req: Request, res: Response): Promise<void> => {
    const { tipoUsuario } = req.query;

    const query: any = {};

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
        const usuarios = await modelUsuario.find(query).select('-password');
        
        // Transformar la respuesta para incluir plan explícitamente
        const usuariosConPlan = usuarios.map(usuario => ({
            ...usuario.toObject(),
            plan: usuario.plan || null // Asegurar que siempre haya un campo plan
        }));

        res.status(200).json({
            success: true,
            data: usuariosConPlan
        });
    } catch (error) {
        const err = error as Error;
        
        res.status(500).json({ success: false, message: err.message });
    }
};

// Controlador para obtener un usuario por su id
export const getUsuarioById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        // INCLUIR plan en la consulta
        const usuario = await modelUsuario.findById(id).select('-password');
        
        if (!usuario) {
            res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                ...usuario.toObject(),
                plan: usuario.plan || null
            }
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    }
};

// Controlador para actualizar un usuario
export const updateUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        const usuario: Partial<Usuario> = req.body;

        // If password is included in the update, hash it before saving
        if (usuario.password) {
            usuario.password = await hashPassword(usuario.password);
        }
        const user = await modelUsuario.findByIdAndUpdate(id, usuario, { new: true });
        res.status(200).json(user);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ message: err.message });
    }
};

// Controlador para eliminar un usuario
export const deleteUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        await modelUsuario.findByIdAndDelete(id);
        res.status(200).json({ message: 'Usuario eliminado' });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ message: err.message });
    }
};

/**
 *
 * loginUsuario: realiza el login de un usuario y devuelve un token
 * @param req: Request
 * @param res: Response
 * @returns: void
 */
export const loginUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
         //buscamos el usuario en la base de datos
        let usuario: any = await modelUsuario.findOne({ email });
        if (!usuario) {
            res.status(401).json({ message: 'Usuario no encontrado' });
            return;
        }
        //comparamos la contraseña   
        const isPasswordValid = await comparePassword(password, usuario.password);
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
            const actualizado = await modelUsuario.findByIdAndUpdate(
                usuario._id,
                { tipoUsuario: 2 },
                { new: true }
            );
            if (actualizado) usuario = actualizado;
        }

        //si es exitoso, generamos un token y lo devolvemos en la cookie
        const token = generarToken(usuario);
        
        //  Incluir plan en la respuesta
        res.status(200).json({ 
            token, 
            message: 'Login exitoso', 
            user: {
                ...usuario.toObject(),
                plan: usuario.plan || null
            }
        });
    } catch (error) {
        const err = error as Error;
        console.log(err);
        res.status(500).json({ message: err.message });
    }
};

/**
 *
 * registerUsuario: registra un usuario en la base de datos
 * @param req: Request
 * @param res: Response
 * @returns: void
 */
export const registerUsuario = async (req: Request, res: Response): Promise<void> => {
    const { nombre, apellido, email, password, tipoUsuario, codigo } = req.body;
    try {
        //verificamos si el usuario ya existe
        const usuario = await modelUsuario.findOne({ email });
        if (usuario) {
            res.status(400).json({ message: 'Usuario ya existe' });
            return;
        }
        //si no existe, lo creamos
        const hashedPassword = await hashPassword(password);
        const newUsuario = new modelUsuario({
            nombre,
            apellido,
            email,
            password: hashedPassword,
            tipoUsuario,
            codigo
        });
        await newUsuario.save();
        res.status(201).json({ message: 'Usuario creado', user: newUsuario });
    } catch (error) {
        const err = error as Error;
        console.log(err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * checkAuth: verifica si el usuario esta autenticado en la aplicacion
 * @param req: Request
 * @param res: Response
 * @returns: void
 */
export const checkAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        // Si la ruta pasó por authMiddleware, ya viene el usuario real (con downgrade aplicado)
        const authReq = req as any;
        if (authReq.user) {
            // Asegurar que el usuario tenga el campo plan y no incluya password
            const userWithPlan = {
                ...authReq.user.toObject ? authReq.user.toObject() : authReq.user,
                plan: authReq.user.plan || null
            };
            
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
                message: 'No provee token' });
            return;
        }   
        //verificamos el token
        const status = await verificarToken(token);
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
        const tokenUser: any = status.usuario;
        const loggedUserId =
            tokenUser?._id?.toString?.() ||
            tokenUser?._id ||
            tokenUser?.id ||
            tokenUser?.userId;

        if (!loggedUserId) {
            res.status(401).json({ 
                success: false,
                message: 'No autorizado (sin id de usuario)' 
            });
            return;
        }

        //  No traer password y asegurar campo plan
        const usuarioDb: any = await modelUsuario.findById(loggedUserId).select('-password');
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

        let usuarioFinal: any = usuarioDb;
        if (premiumVencido) {
            const actualizado = await modelUsuario.findByIdAndUpdate(
                loggedUserId,
                { tipoUsuario: 2, fechaVencimientoPremium: null },
                { new: true }
            ).select('-password');
            
            if (actualizado) usuarioFinal = actualizado;
        }

        //  Incluir plan en la respuesta y asegurar formato consistente
        const usuarioResponse = {
            ...usuarioFinal.toObject(),
            plan: usuarioFinal.plan || null,
            _id: usuarioFinal._id?.toString() || usuarioFinal._id
        };

        res.status(200).json({ 
            success: true,
            message: 'Autorizado', 
            user: usuarioResponse
        });
    } catch (error) {
        const err = error as Error;
        console.error(`Error en ${checkAuth.name}:`, err);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export async function enviarCorreoRecuperacion(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    // setup del transporter de nodemailer para enviar correos
    const transporter = createTransport({
        service: 'zoho',
        host: 'smtp.zoho.com',
        port: 2525,
        secure: false,
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
    const hashedPassword = await hashPassword(newPassword);

    // opciones del correo electrónico con la nueva contraseña
    const mailOptions = {
        from: process.env.MAIL_USER || 'komuness334@zohomail.com',
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
        const usuario = await modelUsuario.findOne({ email });
        if (!usuario) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            throw new Error('Usuario no encontrado');
        } else {
            await transporter.sendMail(mailOptions);
            await modelUsuario.findOneAndUpdate(
                { email },
                { password: hashedPassword }
            );
            res.status(200).json({ message: 'Correo electrónico enviado con éxito' });
        }
    } catch (error) {
        console.error('Error al enviar el correo electrónico:', error);
    }
}

/**
 * Actualizar límite personalizado de publicaciones para un usuario específico (solo admins)
 */
export const actualizarLimiteUsuario = async (req: Request, res: Response): Promise<void> => {
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

        const usuario = await modelUsuario.findByIdAndUpdate(
            id,
            { limitePublicaciones },
            { new: true }
        ).select('-password');

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
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * Actualizar fecha de vencimiento premium para un usuario (solo admins)
 */
export const actualizarVencimientoPremium = async (req: Request, res: Response): Promise<void> => {
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

        const usuario = await modelUsuario.findByIdAndUpdate(
            id,
            {
                fechaVencimientoPremium: new Date(fechaVencimientoPremium),
                tipoUsuario: 3 // Asegurar que sea premium
            },
            { new: true }
        ).select('-password');

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
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

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
export const actualizarMembresiaUsuarioAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { tipoUsuario, plan } = req.body;

        const authReq = req as any;
        const actorTipoUsuario = Number(authReq?.user?.tipoUsuario);

        const tipo = Number(tipoUsuario);
        if (![1, 2, 3].includes(tipo)) {
            res.status(400).json({
                success: false,
                message: 'tipoUsuario debe ser 1 (admin), 2 (básico) o 3 (premium)'
            });
            return;
        }

        const usuarioActual: any = await modelUsuario.findById(id).select('-password');
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
            const actualizado = await modelUsuario.findByIdAndUpdate(
                id,
                { tipoUsuario: 1, ...limpiarPremium },
                { new: true }
            ).select('-password');

            res.status(200).json({
                success: true,
                message: 'Usuario actualizado a Admin',
                data: actualizado
            });
            return;
        }

        // ✅ Pasar a BÁSICO
        if (tipo === 2) {
            const actualizado = await modelUsuario.findByIdAndUpdate(
                id,
                { tipoUsuario: 2, ...limpiarPremium },
                { new: true }
            ).select('-password');

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
        const base =
            (fechaExistente && !isNaN(fechaExistente.getTime()) && fechaExistente > ahora)
                ? fechaExistente
                : ahora;

        const nuevaFechaVencimientoPremium = new Date(base);
        nuevaFechaVencimientoPremium.setDate(nuevaFechaVencimientoPremium.getDate() + dias);

        const actualizado = await modelUsuario.findByIdAndUpdate(
            id,
            {
                tipoUsuario: 3,
                plan: planOk,
                fechaVencimientoPremium: nuevaFechaVencimientoPremium
            },
            { new: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            message: 'Usuario actualizado a Premium',
            plan: planOk,
            fechaVencimientoPremium: actualizado?.fechaVencimientoPremium,
            data: actualizado
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ success: false, message: err.message });
    }
};

// Activar premium para el usuario actualmente autenticado
export const activarPremiumActual = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as any;
        const loggedUserId =
            authReq.user?._id?.toString?.() ||
            authReq.user?._id ||
            authReq.userId ||
            authReq.user?.id;

        if (!loggedUserId) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
            });
            return;
        }

        // PASO 3: cálculo automático de vencimiento (30 días mensual, 365 días anual)
        const rawPlan = String((req as any).body?.plan || 'mensual').toLowerCase().trim();
        const plan = rawPlan === 'anual' ? 'anual' : 'mensual';
        const dias = plan === 'anual' ? 365 : 30;

        // Si ya tenía vencimiento vigente, extendemos desde esa fecha; si no, desde hoy
        const usuarioActual = await modelUsuario.findById(loggedUserId).select('fechaVencimientoPremium');
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

        const usuario = await modelUsuario.findByIdAndUpdate(
            loggedUserId,
            { tipoUsuario: 3, plan, fechaVencimientoPremium: nuevaFechaVencimientoPremium },
            { new: true }
        ).select('-password');

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
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};
