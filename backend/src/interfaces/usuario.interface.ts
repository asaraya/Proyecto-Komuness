import { Document } from "mongoose";

export interface IEncuestaInicio {
    rol?: "comprador" | "vendedor" | "ambos";
    ubicacion?: {
        latitude: number;
        longitude: number;
        direccion: string;
        mapLink?: string;
    };
    queVende?: string;
    etiquetas?: string[];
    completada?: boolean;
    completadaEn?: Date | null;
}

export interface IUsuario extends Document {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    tipoUsuario: number; // 0=super-admin, 1=admin, 2=básico, 3=premium
    codigo: string;
    fechaVencimientoPremium?: Date; // Fecha de vencimiento para usuarios premium
    limitePublicaciones?: number; // Límite personalizado de publicaciones
    plan?: "mensual" | "anual" | null;
    emailConfirmado?: boolean;
    tokenConfirmacion?: string | null;
    tokenConfirmacionExpira?: Date | null;
    encuestaInicio?: IEncuestaInicio;
    puedeCrearCuentaRegresiva?: boolean; // UI65
}
