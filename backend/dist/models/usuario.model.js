"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelUsuario = void 0;
const mongoose_1 = require("mongoose");
const encuestaInicioSchema = new mongoose_1.Schema({
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
    etiquetas: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Etiqueta" }],
    completada: { type: Boolean, default: false },
    completadaEn: { type: Date, default: null }
}, { _id: false });
const usuarioSchema = new mongoose_1.Schema({
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
    encuestaInicio: { type: encuestaInicioSchema, default: undefined }
});
exports.modelUsuario = (0, mongoose_1.model)("Usuario", usuarioSchema);
