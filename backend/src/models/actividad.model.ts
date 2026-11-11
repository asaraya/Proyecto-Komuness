import { Schema, model, Document, Types } from "mongoose";

export interface IActividad extends Document {
  nombre: string;
  descripcion: string;
  fecha: string;
  hora: string;
  ubicacionEscrita: string;
  ubicacion: {
    type: "Point";
    coordinates: [number, number]; // [longitud, latitud]
  };
  usuario: Types.ObjectId;
  createdAt: string;
  updatedAt: string;
}

const actividadSchema = new Schema<IActividad>({
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, required: true, trim: true },
  fecha: { type: String, required: true },
  hora: { type: String, required: true },
  ubicacionEscrita: { type: String, required: true, trim: true },
  ubicacion: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  usuario: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

actividadSchema.index({ ubicacion: "2dsphere" });

export const modelActividad = model<IActividad>("Actividad", actividadSchema);