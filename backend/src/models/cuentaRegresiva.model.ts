import { model, Schema, Types } from "mongoose";

// UI65: cuenta regresiva de la página principal. Si `publicacion` está
// presente, el contador sigue a ese evento (fecha y título); si no, es libre.
export interface ICuentaRegresiva {
    titulo: string;
    fechaObjetivo: Date;
    publicacion?: Types.ObjectId | null;
    enlace?: string;
    creadoPor: Types.ObjectId;
    activo: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const cuentaRegresivaSchema = new Schema<ICuentaRegresiva>(
    {
        titulo: { type: String, required: true, trim: true, maxlength: 120 },
        fechaObjetivo: { type: Date, required: true, index: true },
        publicacion: {
            type: Schema.Types.ObjectId,
            ref: "Publicacion",
            required: false,
            unique: true,
            sparse: true,
        },
        enlace: { type: String, required: false, trim: true },
        creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
        activo: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const modelCuentaRegresiva = model<ICuentaRegresiva>("CuentaRegresiva", cuentaRegresivaSchema);
