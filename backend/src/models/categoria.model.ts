import { Schema, model, Document, Types } from "mongoose";

export interface ICategoria extends Document {
  _id: Types.ObjectId;
  nombre: string;
  estado: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const categoriaSchema = new Schema<ICategoria>({
  nombre: { type: String, required: true, unique: true },
  estado: { type: Boolean, default: true },
}, { 
  timestamps: true 
});

export const modelCategoria = model<ICategoria>("Categoria", categoriaSchema);

