import { Document } from 'mongoose';

interface Archivo {
    nombre: string;
    fechaSubida: string;
    tipoArchivo: string;
    tamano: number;
    autor: string;
    esPublico: boolean;
    url: string; // URL de descarga del archivo en digitalOcean Spaces
    key: string; // Key en digitalOcean Spaces para su eliminacion
    folder: string;
    categoria?: string | null;
    estado: 'pendiente' | 'aprobado' | 'rechazado'; // Estado de aprobación del archivo
    uploadedBy: string; // Usuario que subió el archivo (para rastrear quién lo subió)
}
export interface IArchivo extends Document, Omit<Archivo, 'folder' | 'uploadedBy'> {
    folder: string | { _id: string };
    uploadedBy: string | { _id: string; nombre: string; apellido: string; email: string };
};