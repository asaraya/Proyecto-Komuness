import { IProyectoDestacado } from "@/interfaces/proyectoDestacado.interface";
import { model, Schema } from "mongoose";

/*
// Para usar de referencia, esto esta importado de tutorial.interface
export interface ITutorial extends Document {
    _id: Types.ObjectId;
    nombre: string;
    url: string;
    descripcion: string;
    createdAt: Date;      // generado automáticamente por timestamps
    updatedAt: Date;      // generado automáticamente por timestamps
}
*/
const proyectoDestacadoSchema = new Schema<IProyectoDestacado>(
  {
    nombre: { type: String, required: true, unique: true },
    url: { type: String, required: false },
    descripcion: { type: String, required: false },
  },
  {
    timestamps: true,
  },
);

export const modelProyectoDestacado = model<IProyectoDestacado>(
  "ProyectoDestacado",
  proyectoDestacadoSchema,
);
