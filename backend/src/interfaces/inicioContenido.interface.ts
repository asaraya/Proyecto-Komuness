import { Document, Types } from 'mongoose';

export interface IInicioContenido extends Document {
  eslogan: string;
  frase: string;
  actualizadoPor?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
