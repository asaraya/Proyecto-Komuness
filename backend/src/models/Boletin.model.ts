import { IBoletin } from "@/interfaces/boletin.interface";
import { model, Schema } from "mongoose";

const boletinSchema = new Schema(
    {
        titulo: { type: String, required: true },
        contenido: { type: String, required: true },
        descripcion: { type: String, required: false },
        destinatarios: {
            tipo: { type: String, enum: ["todos", "seleccionados", "rol"], required: true },
            usuariosIds: [{ type: Schema.Types.ObjectId, ref: "Usuario" }],
            roles: [{ type: Number }]
        },
        enviado: { type: Boolean, default: false },
        fechaEnvio: { type: Date, required: false },
        fechaCreacion: { type: Date, default: Date.now },
        creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
        usuariosEnviados: [{ type: Schema.Types.ObjectId, ref: "Usuario" }],
        totalUsuarios: { type: Number, default: 0 },
        enviados: { type: Number, default: 0 },
        fallidos: { type: Number, default: 0 },
        estado: { type: String, enum: ["borrador", "programado", "enviado", "cancelado"], default: "borrador" },
        fechaProgramada: { type: Date, required: false }
    },
    {
        timestamps: true
    }
);

export const modelBoletin = model<IBoletin>("Boletin", boletinSchema);
