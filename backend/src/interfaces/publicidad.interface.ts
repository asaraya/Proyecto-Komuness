import { Document, Types } from "mongoose";

export interface IPublicidad extends Document {
  titulo: string;
  imagen: string;
  descripcion: string;
  // Fechas que ve el público (opcionales), p. ej. las del evento anunciado
  fechaInicioEvento?: Date | null;
  fechaFinEvento?: Date | null;
  // Día en que la publicidad se retira sola (solo la ven los admins)
  fechaCaducidad: Date;
  autor: Types.ObjectId;
  activa: boolean;
  publicacionRelacionada?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}