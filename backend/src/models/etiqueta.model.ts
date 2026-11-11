import { Schema, model, Document, Types } from "mongoose";

export interface IEtiqueta extends Document {
  _id: Types.ObjectId;
  nombre: string;
  estado: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const etiquetaSchema = new Schema<IEtiqueta>(
  {
    nombre: { type: String, required: true, unique: true },
    estado: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

export const modelEtiqueta = model<IEtiqueta>("Etiqueta", etiquetaSchema);
