import { Document, Types } from "mongoose";

export interface ITutorial extends Document {
    _id: Types.ObjectId;
    nombre: string;
    url: string;
    descripcion: string;
    createdAt: Date;      // generado automáticamente por timestamps
    updatedAt: Date;      // generado automáticamente por timestamps
}



