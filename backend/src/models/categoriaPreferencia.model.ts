import { Schema, model, Document, Types } from "mongoose";

export interface ICategoriaPreferencia extends Document {
  _id: Types.ObjectId;
  usuarioId: Types.ObjectId;
  categoriaId: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const categoriaPreferenciaSchema = new Schema<ICategoriaPreferencia>({
  usuarioId: { type:  Schema.Types.ObjectId, required: true, ref: "Usuario"},
  categoriaId: { type:  Schema.Types.ObjectId, required: true, ref: "Categoria"},
}, { 
  timestamps: true 
});

categoriaPreferenciaSchema.index({ usuarioId: 1, categoriaId: 1 }, { unique: true });
categoriaPreferenciaSchema.index({ categoriaId: 1 });
export const modelCategoriaPreferencia = model<ICategoriaPreferencia>("CategoriaPreferencia", categoriaPreferenciaSchema);