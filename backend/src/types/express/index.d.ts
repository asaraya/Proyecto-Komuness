import "express";

declare module "express" {
  export interface Request {
    user?: {
      _id: string;
      nombre: string;
      apellido: string;
      avatar?: string;
    };
  }
}
