import { model, Schema } from "mongoose";
import { IPaqueteSuscripcion } from "@/interfaces/paqueteSuscripcion.interface";

const paqueteSuscripcionSchema = new Schema<IPaqueteSuscripcion>(
  {
    nombre: { type: String, required: true, trim: true, unique: true },
    descripcion: { type: String, default: "" },

    monto: { type: Number, required: true, min: 0 },
    moneda: { type: String, enum: ["USD", "CRC"], required: true, default: "USD" },

    duracionDias: { type: Number, required: true, min: 1 },
    tipoUsuarioOtorgado: { type: Number, required: true, default: 3 },

    limitePublicaciones: { type: Number, min: 0 },
    beneficios: { type: [String], default: [] },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const modelPaqueteSuscripcion = model<IPaqueteSuscripcion>(
  "PaqueteSuscripcion",
  paqueteSuscripcionSchema
);
