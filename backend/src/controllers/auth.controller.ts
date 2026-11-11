import { Request, Response } from "express";
import { createTransport } from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";
import { modelUsuario } from "../models/usuario.model";
import { comparePassword, hashPassword } from "../utils/bcryptjs";
import { generarToken } from "../utils/jwt";
import { IUsuario } from "../interfaces/usuario.interface";
import { normalizeEncuestaInicio } from "../utils/encuestaInicio";

dotenv.config();

const CONFIRMATION_TOKEN_HOURS = 48;
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

const escapeRegExp = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildEmailFilter = (email: string): { email: RegExp } => {
    return {
        email: new RegExp("^" + escapeRegExp(email) + "$", "i")
    };
};

const isPendingConfirmation = (usuario: any): boolean => {
    return !!usuario && usuario.emailConfirmado === false;
};

const sanitizeUser = (usuario: any): any => {
    const safeUser = usuario && typeof usuario.toObject === "function"
        ? usuario.toObject()
        : { ...usuario };

    if (!safeUser) {
        return null;
    }

    delete safeUser.password;
    delete safeUser.tokenConfirmacion;
    delete safeUser.tokenConfirmacionExpira;

    return {
        ...safeUser,
        plan: safeUser.plan || null
    };
};

const generateConfirmationToken = (): { token: string; expiresAt: Date } => {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_HOURS * 60 * 60 * 1000);
    return { token, expiresAt };
};

const getBaseUrlFromRequest = (req: Request): string => {
    const configuredBase = String(process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || "").replace(/\/+$/, "");
    if (configuredBase) {
        return configuredBase;
    }

    const forwardedProto = req.get("x-forwarded-proto");
    const protocol = forwardedProto ? String(forwardedProto).split(",")[0].trim() : req.protocol;
    const host = req.get("host") || "localhost:5000";

    return protocol + "://" + host;
};

const buildConfirmationLink = (req: Request, token: string): string => {
    return getBaseUrlFromRequest(req) + "/api/usuario/confirmar-cuenta?token=" + encodeURIComponent(token);
};

const sendConfirmationEmail = async (email: string, nombre: string, link: string): Promise<void> => {
    const html =
        "<p>Hola " + nombre + ",</p>" +
        "<p>Gracias por crear tu cuenta en Komuness.</p>" +
        "<p>Para activar tu cuenta, confirma tu correo haciendo clic en este enlace:</p>" +
        "<p><a href=\"" + link + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + link + "</a></p>" +
        "<p>Si no fuiste tu, ignora este mensaje.</p>";

    await transporter.sendMail({
        from: "\"Komuness\" <" + String(process.env.MAIL_USER || "") + ">",
        to: email,
        subject: "Confirma la creacion de tu cuenta en Komuness",
        html
    });
};

const downgradePremiumIfExpired = async (usuario: any): Promise<any> => {
    const now = new Date();
    const expireDate = usuario.fechaVencimientoPremium ? new Date(usuario.fechaVencimientoPremium) : null;
    const validDate = !!expireDate && !isNaN(expireDate.getTime());
    const premiumExpired = usuario.tipoUsuario === 3 && validDate && expireDate <= now;

    if (!premiumExpired) {
        return usuario;
    }

    const updated = await modelUsuario.findByIdAndUpdate(
        usuario._id,
        {
            tipoUsuario: 2,
            fechaVencimientoPremium: null,
            plan: null
        },
        { new: true }
    );

    return updated || usuario;
};

export const registerUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const body = req.body as {
            nombre?: string;
            apellido?: string;
            email?: string;
            password?: string;
            tipoUsuario?: number;
            codigo?: string;
            encuestaInicio?: unknown;
        };

        const nombre = body.nombre ? String(body.nombre).trim() : "";
        const apellido = body.apellido ? String(body.apellido).trim() : "";
        const email = body.email ? String(body.email).trim().toLowerCase() : "";
        const password = body.password ? String(body.password) : "";
        const tipoUsuario = Number.isFinite(Number(body.tipoUsuario)) ? Number(body.tipoUsuario) : 2;
        const codigo = body.codigo && String(body.codigo).trim() ? String(body.codigo).trim() : "0";
        const encuestaInicio = normalizeEncuestaInicio(body.encuestaInicio);

        if (!nombre || !apellido || !email || !password) {
            res.status(400).json({
                message: "nombre, apellido, email y password son obligatorios"
            });
            return;
        }

        const existingUser: any = await modelUsuario.findOne(buildEmailFilter(email));

        if (existingUser && !isPendingConfirmation(existingUser)) {
            res.status(400).json({ message: "Usuario ya existe" });
            return;
        }

        const tokenData = generateConfirmationToken();

        if (isPendingConfirmation(existingUser)) {
            existingUser.tokenConfirmacion = tokenData.token;
            existingUser.tokenConfirmacionExpira = tokenData.expiresAt;
            await existingUser.save();

            const link = buildConfirmationLink(req, tokenData.token);
            sendConfirmationEmail(existingUser.email, String(existingUser.nombre || ""), link).catch((emailError) => {
                console.error("No se pudo enviar el correo de confirmacion (reenvio):", emailError);
            });

            res.status(200).json({
                message: "Tu cuenta aun no esta confirmada. Te reenviamos el correo de confirmacion."
            });
            return;
        }

        const hashedPassword = await hashPassword(password);

        const nuevoUsuario = new modelUsuario({
            nombre,
            apellido,
            email,
            password: hashedPassword,
            tipoUsuario,
            codigo,
            encuestaInicio,
            emailConfirmado: false,
            tokenConfirmacion: tokenData.token,
            tokenConfirmacionExpira: tokenData.expiresAt
        });

        await nuevoUsuario.save();

        const link = buildConfirmationLink(req, tokenData.token);
        sendConfirmationEmail(nuevoUsuario.email, nuevoUsuario.nombre, link).catch((emailError) => {
            console.error("No se pudo enviar el correo de confirmacion:", emailError);
        });

        res.status(201).json({
            message: "Usuario creado. Revisa tu correo y confirma la creacion de la cuenta antes de iniciar sesion.",
            user: sanitizeUser(nuevoUsuario)
        });
    } catch (error) {
        const err = error as Error;
        console.error("Error en registerUsuario:", err);
        res.status(500).json({ message: err.message });
    }
};

export const loginUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const body = req.body as { email?: string; password?: string };
        const email = body.email ? String(body.email).trim().toLowerCase() : "";
        const password = body.password ? String(body.password) : "";

        if (!email || !password) {
            res.status(400).json({ message: "email y password son obligatorios" });
            return;
        }

        let usuario: any = await modelUsuario.findOne(buildEmailFilter(email));

        if (!usuario) {
            res.status(401).json({ message: "Usuario no encontrado" });
            return;
        }

        const isPasswordValid = await comparePassword(password, usuario.password);
        if (!isPasswordValid) {
            res.status(401).json({ message: "Contrasena incorrecta" });
            return;
        }

        if (isPendingConfirmation(usuario)) {
            res.status(403).json({
                code: "EMAIL_NOT_CONFIRMED",
                message: "Debes confirmar la creacion de tu cuenta desde el correo enviado antes de iniciar sesion."
            });
            return;
        }

        usuario = await downgradePremiumIfExpired(usuario);

        const token = generarToken(usuario as IUsuario);

        res.status(200).json({
            token,
            message: "Login exitoso",
            user: sanitizeUser(usuario)
        });
    } catch (error) {
        const err = error as Error;
        console.error("Error en loginUsuario:", err);
        res.status(500).json({ message: err.message });
    }
};

const getFrontendLoginRedirectUrl = (
    estado: "ok" | "error",
    mensaje: string
): string => {
    const frontendBaseRaw = String(
        process.env.FRONTEND_URL ||
        process.env.FRONTEND_PUBLIC_URL ||
        "http://localhost:3000"
    ).replace(/\/+$/, "");

    const url = new URL(frontendBaseRaw + "/iniciarSesion");
    url.searchParams.set("confirmacion", estado);
    url.searchParams.set("mensaje", mensaje);
    return url.toString();
};

const responderConfirmacionCuenta = (
    req: Request,
    res: Response,
    status: number,
    estado: "ok" | "error",
    mensaje: string
): void => {
    const acceptHeader = String(req.headers.accept || "");
    const esNavegador = !acceptHeader.includes("application/json");

    if (esNavegador) {
        res.redirect(302, getFrontendLoginRedirectUrl(estado, mensaje));
        return;
    }

    res.status(status).json({
        success: estado === "ok",
        message: mensaje
    });
};

export const confirmarCuentaUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.query.token ? String(req.query.token).trim() : "";

        if (!token) {
            responderConfirmacionCuenta(
                req,
                res,
                400,
                "error",
                "Token de confirmacion requerido."
            );
            return;
        }

        const usuario: any = await modelUsuario.findOne({ tokenConfirmacion: token });

        if (!usuario) {
            responderConfirmacionCuenta(
                req,
                res,
                400,
                "error",
                "Token de confirmacion invalido."
            );
            return;
        }

        if (!isPendingConfirmation(usuario)) {
            responderConfirmacionCuenta(
                req,
                res,
                200,
                "ok",
                "La cuenta ya estaba confirmada. Ya puedes iniciar sesion."
            );
            return;
        }

        if (usuario.tokenConfirmacionExpira) {
            const expiresAt = new Date(usuario.tokenConfirmacionExpira);
            if (!isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
                responderConfirmacionCuenta(
                    req,
                    res,
                    400,
                    "error",
                    "El enlace de confirmacion expiro. Solicita un nuevo correo de confirmacion."
                );
                return;
            }
        }

        usuario.emailConfirmado = true;
        usuario.tokenConfirmacion = null;
        usuario.tokenConfirmacionExpira = null;
        await usuario.save();

        responderConfirmacionCuenta(
            req,
            res,
            200,
            "ok",
            "Cuenta confirmada exitosamente. Ya puedes iniciar sesion."
        );
    } catch (error) {
        const err = error as Error;
        console.error("Error en confirmarCuentaUsuario:", err);
        responderConfirmacionCuenta(
            req,
            res,
            500,
            "error",
            "Ocurrio un error al confirmar la cuenta."
        );
    }
};

export const reenviarConfirmacionUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const email = req.body && req.body.email ? String(req.body.email).trim().toLowerCase() : "";

        if (!email) {
            res.status(400).json({ message: "El email es obligatorio" });
            return;
        }

        const usuario: any = await modelUsuario.findOne(buildEmailFilter(email));

        if (!usuario) {
            res.status(404).json({ message: "Usuario no encontrado" });
            return;
        }

        if (!isPendingConfirmation(usuario)) {
            res.status(400).json({ message: "La cuenta ya esta confirmada" });
            return;
        }

        const tokenData = generateConfirmationToken();
        usuario.tokenConfirmacion = tokenData.token;
        usuario.tokenConfirmacionExpira = tokenData.expiresAt;
        await usuario.save();

        const link = buildConfirmationLink(req, tokenData.token);
        await sendConfirmationEmail(usuario.email, String(usuario.nombre || ""), link);

        res.status(200).json({
            message: "Correo de confirmacion reenviado. Revisa tu bandeja de entrada."
        });
    } catch (error) {
        const err = error as Error;
        console.error("Error en reenviarConfirmacionUsuario:", err);
        res.status(500).json({ message: err.message });
    }
};
