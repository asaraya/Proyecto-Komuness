import { Document } from "mongoose";

export type Moneda = "USD" | "CRC";

export interface IPaqueteSuscripcion extends Document {
  nombre: string;               // "Plan Mensual", "Plan Anual", etc.
  descripcion?: string;

  monto: number;                // precio del paquete
  moneda: Moneda;               // USD/CRC (hoy en FE usan USD)

  duracionDias: number;         // 30/365 (para calcular fechaVencimientoPremium)
  tipoUsuarioOtorgado: number;  // normalmente 3 (premium)

  limitePublicaciones?: number; // opcional: override por paquete
  beneficios: string[];         // opcional
  activo: boolean;

  createdAt: Date;
  updatedAt: Date;
}
