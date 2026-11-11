import { Document } from "mongoose";

export interface IBoletin extends Document {
    titulo: string;
    contenido: string;
    descripcion?: string;
    destinatarios: {
        tipo: "todos" | "seleccionados" | "rol";
        usuariosIds?: string[];
        roles?: number[];
    };
    enviado: boolean;
    fechaEnvio?: Date;
    fechaCreacion: Date;
    creadoPor: string;
    usuariosEnviados?: string[];
    totalUsuarios?: number;
    enviados?: number;
    fallidos?: number;
    estado: "borrador" | "programado" | "enviado" | "cancelado";
    fechaProgramada?: Date;
}
