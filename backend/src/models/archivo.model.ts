import { IArchivo } from "@/interfaces/archivo.interface";
import { Schema, model } from "mongoose";


//schema archivo
const archivoSchema = new Schema({
    nombre: { type: String, required: true },
    fechaSubida: { type: String, required: true },
    tipoArchivo: { type: String, required: true },
    tamano: { type: Number, required: true },
    autor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    esPublico: { type: Boolean, required: true },
    url: { type: String, required: true }, // URL de descarga del archivo en digitalOcean Spaces
    key: { type: String, required: true }, // Nombre del archivo en digitalOcean Spaces
    folder: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    // Obligatoria al subir (se valida en el controlador; archivos antiguos pueden no tenerla)
    categoria: { type: Schema.Types.ObjectId, ref: 'Categoria', default: null },
    estado: { 
        type: String, 
        enum: ['pendiente', 'aprobado', 'rechazado'], 
        default: 'aprobado' // Por defecto aprobado para admins, se cambiará en el controlador para usuarios básicos/premium
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true }, // Usuario que subió el archivo
})

export const Archivo = model<IArchivo>('Archivo', archivoSchema);