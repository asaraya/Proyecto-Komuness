import { IUsuario } from "@/interfaces/usuario.interface";
import { model, Schema } from "mongoose";

const encuestaInicioSchema = new Schema(
    {
        rol: {
            type: String,
            enum: ["comprador", "vendedor", "ambos"],
            default: "comprador"
        },
        ubicacion: {
            latitude: { type: Number, required: false },
            longitude: { type: Number, required: false },
            direccion: { type: String, trim: true, default: "" },
            mapLink: { type: String, trim: true, default: "" }
        },
        queVende: { type: String, trim: true, default: "" },
        etiquetas: [{ type: Schema.Types.ObjectId, ref: "Etiqueta" }],
        completada: { type: Boolean, default: false },
        completadaEn: { type: Date, default: null }
    },
    { _id: false }
);

const usuarioSchema = new Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    tipoUsuario: { type: Number, required: true }, // 0=super-admin, 1=admin, 2=basico, 3=premium
    codigo: { type: String, required: true },
    fechaVencimientoPremium: { type: Date, required: false }, // Fecha de vencimiento para usuarios premium
    limitePublicaciones: { type: Number, required: false }, // Limite personalizado (opcional)
    plan: {
        type: String,
        enum: ["mensual", "anual", null],
        default: null,
        required: false
    },
    emailConfirmado: { type: Boolean, default: false },
    tokenConfirmacion: { type: String, required: false, default: null },
    tokenConfirmacionExpira: { type: Date, required: false, default: null },
    encuestaInicio: { type: encuestaInicioSchema, default: undefined },
    // UI65: puede crear cuentas regresivas para la principal (admins siempre pueden)
    puedeCrearCuentaRegresiva: { type: Boolean, default: false }
});

export const modelUsuario = model<IUsuario>("Usuario", usuarioSchema);
