import { Request, Response} from "express";
import { modelPaqueteSuscripcion } from "../models/paqueteSuscripcion.model";


export const createPaqueteSuscripcion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion, monto, moneda, duracionDias, tipoUsuarioOtorgado, limitePublicaciones, beneficios, activo } = req.body;

    if (!nombre?.trim()) {
      res.status(400).json({ message: "El nombre del paquete de subscripción es obligatorio" });
      return;
    }
    if (monto === undefined || monto === null) {
      res.status(400).json({ message: "El monto del paquete de subscripción es obligatorio" });
      return;
    }
    if (monto < 0){
      res.status(400).json({ message: "El monto del paquete de subscripción debe ser un número mayor a 0" });
      return;
    }
    if (!moneda || !["USD","CRC"].includes(moneda)) {
      res.status(400).json({ message: "La moneda del paquete de subscripción no es válida" });
      return;
    }
    if (duracionDias === undefined || duracionDias === null) {
      res.status(400).json({ message: "La duración (días) del paquete de subscripción es obligatoria" });
      return;
    }
    if (duracionDias < 1){
      res.status(400).json({ message: "La duración (días) del paquete de subscripción debe ser un número mayor a 1" });
      return;
    }

    if (limitePublicaciones < 0){
      res.status(400).json({ message: "El límite de publicaciones del paquete de subscripción debe ser un número mayor a 0" });
      return;
    }
    if (beneficios && !Array.isArray(beneficios)) {
      res.status(400).json({ message: "Beneficios debe ser un arreglo" });
      return; 
    }

    const nuevoPaquete = new modelPaqueteSuscripcion({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() ?? "",
      monto: monto,
      moneda: moneda,
      duracionDias: duracionDias,
      tipoUsuarioOtorgado: tipoUsuarioOtorgado ?? 3,
      beneficios: beneficios,
      activo: activo ?? true,
    });

    const saved = await nuevoPaquete.save();
    res.status(201).json(saved);
  } catch (error: any) {
    console.error(error);
    
    if (error?.code == 11000) {
        res.status(409).json({ message: "Ya existe un paquete con ese nombre" });
        return;
    }

    res.status(500).json({ message: "Error al crear el paquete" });
  }
};

export const deletePaqueteSuscripcion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await modelPaqueteSuscripcion.findByIdAndDelete(id);

    res.json({ message: "Paquete de subscripción eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar el paquete de subscripción" });
  }
};

export const getPaquetesSuscripcion = async (req: Request, res: Response): Promise<void> => {
  try {
    const paquetes = await modelPaqueteSuscripcion.find();
    res.json({
      data: paquetes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener los paquetes de subscripción" });
  }
};

export const updatePaquetesSuscripcion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, monto, moneda, duracionDias, tipoUsuarioOtorgado, limitePublicaciones, beneficios, activo } = req.body;

    if (!nombre?.trim()) {
      res.status(400).json({ message: "El nombre del paquete de subscripción es obligatorio" });
      return;
    }
    if (monto === undefined || monto === null) {
      res.status(400).json({ message: "El monto del paquete de subscripción es obligatorio" });
      return;
    }
    if (monto < 0){
      res.status(400).json({ message: "El monto del paquete de subscripción debe ser un número mayor a 0" });
      return;
    }
    if (!moneda || !["USD","CRC"].includes(moneda)) {
      res.status(400).json({ message: "La moneda del paquete de subscripción no es válida" });
      return;
    }
    if (duracionDias === undefined || duracionDias === null) {
      res.status(400).json({ message: "La duración (días) del paquete de subscripción es obligatoria" });
      return;
    }
    if (duracionDias < 1){
      res.status(400).json({ message: "La duración (días) del paquete de subscripción debe ser un número mayor a 1" });
      return;
    }

    if (limitePublicaciones < 0){
      res.status(400).json({ message: "El límite de publicaciones del paquete de subscripción debe ser un número mayor a 0" });
      return;
    }
    if (beneficios && !Array.isArray(beneficios)) {
      res.status(400).json({ message: "Beneficios debe ser un arreglo" });
      return; 
    }
 
    if (!nombre?.trim()) {
      res.status(400).json({ message: "El nombre del tutorial es obligatorio" });
      return;
    }
 
    const paquete = await modelPaqueteSuscripcion.findByIdAndUpdate(
      id, 
      {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() ?? "",
        monto: monto,
        moneda: moneda,
        duracionDias: duracionDias,
        tipoUsuarioOtorgado: tipoUsuarioOtorgado ?? 3,
        beneficios: beneficios,
        activo: activo ?? true,
      }
    );
 
    if (!paquete) {
      res.status(404).json({ message: "Paquete de subscripción no encontrado" });
      return;
    }
 
    res.status(200).json(paquete);
  } catch (error: any) {
    console.error(error);
 
    if (error?.code === 11000) {
      res.status(409).json({ message: "Ya existe un paquete de subscripción con ese nombre" });
      return;
    }
    res.status(500).json({ message: "Error al actualizar el paquete de subscripción" });
  }
};


