import { INotificacion } from "@/interfaces/notificacion.interface";
import { model, Schema } from "mongoose";

const notificacionSchema = new Schema<INotificacion>(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    destinatario: { type: Schema.Types.ObjectId, ref: "Usuario", required: false, default: null },
    recipientes: [{ type: Schema.Types.ObjectId, ref: "Usuario"}],
    publicacionId: { type: Schema.Types.ObjectId, ref: "Publicacion", required: false, default: null },
    fechaCaducidad: { type: Date, required: false, default: null },
    vistoPor: [{ type: Schema.Types.ObjectId, ref: "Usuario", default: [] }],
    tipo: { type: String, enum: ["general", "formulario", "recordatorio"], default: "general" },
    formularioUrl: { type: String, required: false, default: null },
  },
  {
    timestamps: true,
    strict: true,
  }
);

notificacionSchema.index({ destinatario: 1, createdAt: -1 });
notificacionSchema.index({ destinatario: 1, vistoPor: 1 });
notificacionSchema.index({ fechaCaducidad: 1 });
notificacionSchema.index({ recipientes: 1, createdAt: -1 });
//notificacionSchema.index({ recipientes: 1, vistoPor: 1 });
notificacionSchema.index({ vistoPor: 1,});

export const modelNotificacion = model<INotificacion>("Notificacion", notificacionSchema);
