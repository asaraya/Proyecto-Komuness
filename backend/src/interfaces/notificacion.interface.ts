import { Document, Types } from "mongoose";

export interface INotificacion extends Document {
    nombre: string;
    descripcion: string;
    destinatario: Types.ObjectId;
    publicacionId?: Types.ObjectId | null;
    fechaCaducidad?: Date | null;
    recipientes: Types.ObjectId[];
    vistoPor: Types.ObjectId[];
    tipo?: "general" | "formulario" | "recordatorio"; // tipo de notificación
    formularioUrl?: string | null; // URL del Google Forms (solo para tipo formulario)
    createdAt: Date;
    updatedAt: Date;
}

