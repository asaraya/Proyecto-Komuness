import { Request, Response } from "express";
import { createTransport } from "nodemailer";
import dotenv from "dotenv";
import { modelBoletin } from "../models/Boletin.model";
import { modelUsuario } from "../models/usuario.model";
import { IUsuario } from "../interfaces/usuario.interface";

dotenv.config();

const createMailTransport = () => {
    const user = String(process.env.MAIL_USER || "");
    const pass = String(process.env.MAIL_PASS || "");
    const isGmail = user.toLowerCase().endsWith("@gmail.com");

    if (isGmail) {
        return createTransport({
            service: "gmail",
            auth: { user, pass },
            tls: { rejectUnauthorized: false }
        });
    }

    return createTransport({
        host: process.env.MAIL_HOST || "smtp.zoho.com",
        port: Number(process.env.MAIL_PORT || 2525),
        secure: false,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
    });
};

const transporter = createMailTransport();

/**
 * Crear un nuevo boletín (borrador)
 */
export const crearBoletin = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as Request & { user?: IUsuario }).user;
        if (!user) {
            res.status(401).json({ success: false, message: "No autorizado" });
            return;
        }

        const { titulo, contenido, descripcion, destinatarios } = req.body;

        if (!titulo || !contenido || !destinatarios) {
            res.status(400).json({
                success: false,
                message: "Título, contenido y destinatarios son obligatorios"
            });
            return;
        }

        const boletin = new modelBoletin({
            titulo,
            contenido,
            descripcion,
            destinatarios,
            creadoPor: user._id,
            estado: "borrador"
        });

        await boletin.save();

        res.status(201).json({
            success: true,
            message: "Boletín creado exitosamente",
            data: boletin
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
 * Obtener todos los boletines (solo admin)
 */
export const obtenerBoletines = async (req: Request, res: Response): Promise<void> => {
    try {
        const boletines = await modelBoletin.find()
            .populate("creadoPor", "nombre apellido email")
            .populate("usuariosEnviados", "nombre apellido email")
            .sort({ fechaCreacion: -1 });

        res.status(200).json({
            success: true,
            data: boletines
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
 * Obtener un boletín por ID
 */
export const obtenerBoletinPorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const boletin = await modelBoletin.findById(id)
            .populate("creadoPor", "nombre apellido email")
            .populate("usuariosEnviados", "nombre apellido email");

        if (!boletin) {
            res.status(404).json({
                success: false,
                message: "Boletín no encontrado"
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: boletin
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
 * Actualizar un boletín (solo en estado borrador)
 */
export const actualizarBoletin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { titulo, contenido, descripcion, destinatarios } = req.body;

        const boletin = await modelBoletin.findById(id);

        if (!boletin) {
            res.status(404).json({
                success: false,
                message: "Boletín no encontrado"
            });
            return;
        }

        if (boletin.estado !== "borrador") {
            res.status(400).json({
                success: false,
                message: "Solo se pueden editar boletines en estado borrador"
            });
            return;
        }

        if (titulo) boletin.titulo = titulo;
        if (contenido) boletin.contenido = contenido;
        if (descripcion) boletin.descripcion = descripcion;
        if (destinatarios) boletin.destinatarios = destinatarios;

        await boletin.save();

        res.status(200).json({
            success: true,
            message: "Boletín actualizado exitosamente",
            data: boletin
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
 * Enviar boletín a usuarios
 */
export const enviarBoletin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as Request & { user?: IUsuario }).user;

        if (!user) {
            res.status(401).json({ success: false, message: "No autorizado" });
            return;
        }

        const boletin = await modelBoletin.findById(id);

        if (!boletin) {
            res.status(404).json({
                success: false,
                message: "Boletín no encontrado"
            });
            return;
        }

        if (boletin.estado === "enviado") {
            res.status(400).json({
                success: false,
                message: "Este boletín ya ha sido enviado"
            });
            return;
        }

        // Obtener lista de destinatarios
        let usuarios: any[] = [];

        if (boletin.destinatarios.tipo === "todos") {
            usuarios = await modelUsuario.find({
                tipoUsuario: { $in: [2, 3] } // Solo usuarios básicos y premium
            });
        } else if (boletin.destinatarios.tipo === "seleccionados" && boletin.destinatarios.usuariosIds) {
            usuarios = await modelUsuario.find({
                _id: { $in: boletin.destinatarios.usuariosIds }
            });
        } else if (boletin.destinatarios.tipo === "rol" && boletin.destinatarios.roles) {
            usuarios = await modelUsuario.find({
                tipoUsuario: { $in: boletin.destinatarios.roles }
            });
        }

        boletin.totalUsuarios = usuarios.length;
        let enviados = 0;
        let fallidos = 0;

        // Enviar emails
        for (const usuario of usuarios) {
            try {
                const html = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                        <div style="background-color: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #1e3a8a;">${boletin.titulo}</h2>
                            <hr style="border: 1px solid #e5e7eb;">
                            <div style="color: #333; line-height: 1.6;">
                                ${boletin.contenido}
                            </div>
                            <hr style="border: 1px solid #e5e7eb;">
                            <p style="color: #666; font-size: 12px;">
                                Este es un boletín de Komuness. Si deseas dejar de recibir estos mensajes, contacta con nosotros.
                            </p>
                        </div>
                    </div>
                `;

                await transporter.sendMail({
                    from: `"Komuness" <${String(process.env.MAIL_USER || "")}>`,
                    to: usuario.email,
                    subject: boletin.titulo,
                    html
                });

                boletin.usuariosEnviados?.push(usuario._id);
                enviados++;
            } catch (emailError) {
                console.error(`Error enviando email a ${usuario.email}:`, emailError);
                fallidos++;
            }
        }

        boletin.enviados = enviados;
        boletin.fallidos = fallidos;
        boletin.enviado = true;
        boletin.estado = "enviado";
        boletin.fechaEnvio = new Date();

        await boletin.save();

        res.status(200).json({
            success: true,
            message: `Boletín enviado a ${enviados} usuarios. ${fallidos > 0 ? `${fallidos} fallos.` : ""}`,
            data: {
                boletinId: boletin._id,
                totalUsuarios: boletin.totalUsuarios,
                enviados,
                fallidos
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

/**
 * Eliminar un boletín (solo si está en borrador)
 */
export const eliminarBoletin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const boletin = await modelBoletin.findById(id);

        if (!boletin) {
            res.status(404).json({
                success: false,
                message: "Boletín no encontrado"
            });
            return;
        }

        if (boletin.estado !== "borrador") {
            res.status(400).json({
                success: false,
                message: "Solo se pueden eliminar boletines en estado borrador"
            });
            return;
        }

        await modelBoletin.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Boletín eliminado exitosamente"
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
 * Cancelar envío de boletín programado
 */
export const cancelarBoletin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const boletin = await modelBoletin.findById(id);

        if (!boletin) {
            res.status(404).json({
                success: false,
                message: "Boletín no encontrado"
            });
            return;
        }

        if (boletin.estado === "enviado") {
            res.status(400).json({
                success: false,
                message: "No se puede cancelar un boletín ya enviado"
            });
            return;
        }

        boletin.estado = "cancelado";
        await boletin.save();

        res.status(200).json({
            success: true,
            message: "Boletín cancelado exitosamente",
            data: boletin
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
