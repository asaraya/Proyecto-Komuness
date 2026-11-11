"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Archivo = void 0;
const mongoose_1 = require("mongoose");
//schema archivo
const archivoSchema = new mongoose_1.Schema({
    nombre: { type: String, required: true },
    fechaSubida: { type: String, required: true },
    tipoArchivo: { type: String, required: true },
    tamano: { type: Number, required: true },
    autor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    esPublico: { type: Boolean, required: true },
    url: { type: String, required: true }, // URL de descarga del archivo en digitalOcean Spaces
    key: { type: String, required: true }, // Nombre del archivo en digitalOcean Spaces
    folder: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Folder', default: null },
    estado: {
        type: String,
        enum: ['pendiente', 'aprobado', 'rechazado'],
        default: 'aprobado' // Por defecto aprobado para admins, se cambiará en el controlador para usuarios básicos/premium
    },
    uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Usuario', required: true }, // Usuario que subió el archivo
});
exports.Archivo = (0, mongoose_1.model)('Archivo', archivoSchema);
