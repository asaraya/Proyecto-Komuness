import { Request, Response, NextFunction } from 'express';
import { verificarToken } from '../utils/jwt';
import { modelUsuario } from '../models/usuario.model';

/**
 * Middleware para verificar el token de autenticación recuperado desde el header Authorization (Bearer) 
 * Además aplica downgrade automático si el premium ya venció.
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

        const status = await verificarToken(token);

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
        const tokenUser: any = status.usuario;
        const loggedUserId =
            tokenUser?._id?.toString?.() ||
            tokenUser?._id ||
            tokenUser?.id ||
            tokenUser?.userId;

        if (!loggedUserId) {
            res.status(401).json({ message: 'No autorizado (sin id de usuario)' });
            return;
        }

        //  NO exponer password y ASEGURAR que incluya el campo plan
        const usuarioDb: any = await modelUsuario.findById(loggedUserId).select('-password');
        if (!usuarioDb) {
            res.status(401).json({ message: 'No autorizado (usuario no existe)' });
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

        // ✅ Asegurar que el objeto usuario incluya el campo plan (aunque sea null)
        const usuarioParaRequest = {
            ...usuarioFinal.toObject(),
            plan: usuarioFinal.plan || null
        };

        (req as Request & { user?: any; userId?: any }).user = usuarioParaRequest;
        (req as any).userId = usuarioFinal?._id;

        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: `Error interno del servidor en al funcion: ${authMiddleware.name}`,
            error: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
};
