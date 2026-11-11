import { Schema, model } from 'mongoose';
import { IInicioContenido } from '../interfaces/inicioContenido.interface';

const inicioContenidoSchema = new Schema<IInicioContenido>(
  {
    eslogan: { type: String, default: '' },
    frase: { type: String, default: '' },
    actualizadoPor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: false }
  },
  {
    timestamps: true
  }
);

export const modelInicioContenido = model<IInicioContenido>('InicioContenido', inicioContenidoSchema);
