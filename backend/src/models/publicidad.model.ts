import { IPublicidad } from "@/interfaces/publicidad.interface";
import { model, Schema } from "mongoose";

const publicidadSchema = new Schema<IPublicidad>(
  {
    // No es required en el schema para no romper las publicidades ya creadas;
    // el controlador lo exige al crear y al editar
    titulo: { type: String, trim: true, maxlength: 80, default: "" },
    imagen: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    fechaInicioEvento: { type: Date, default: null },
    fechaFinEvento: { type: Date, default: null },
    fechaCaducidad: { type: Date, required: true },
    autor: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
    activa: { type: Boolean, default: true },
    publicacionRelacionada: {
      type: Schema.Types.ObjectId,
      ref: "Publicacion",
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

publicidadSchema.index({ activa: 1 });
publicidadSchema.index({ fechaCaducidad: 1 });
publicidadSchema.index({ autor: 1 });

export const modelPublicidad = model<IPublicidad>("Publicidad", publicidadSchema);
