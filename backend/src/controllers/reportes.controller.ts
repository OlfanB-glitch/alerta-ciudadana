import { Request, Response } from "express";
import mongoose from "mongoose";
import { Reporte, type IReporte } from "../models/Reporte";

/**
 * POST /api/reportes
 * Crea un reporte nuevo.
 * Recibe longitud y latitud por separado y arma el GeoJSON internamente,
 * para que quien llama la API no tenga que recordar el orden [lon, lat].
 */
export async function crearReporte(req: Request, res: Response): Promise<void> {
  try {
    const {
      tipo,
      descripcion,
      gravedad,
      estado,
      longitud,
      latitud,
      direccionTexto,
      fechaIncidente,
    } = req.body;

    const nuevoReporte = await Reporte.create({
      tipo,
      descripcion,
      gravedad,
      estado,
      ubicacion:
        longitud !== undefined && latitud !== undefined
          ? { type: "Point", coordinates: [longitud, latitud] }
          : undefined,
      direccionTexto,
      fechaIncidente,
    });

    res.status(201).json(nuevoReporte);
  } catch (error) {
    // Si los datos no cumplen las reglas del modelo → 400 con los detalles.
    if (error instanceof mongoose.Error.ValidationError) {
      const detalles = Object.values(error.errors).map((e) => e.message);
      res.status(400).json({ error: "Datos inválidos", detalles });
      return;
    }
    console.error("Error al crear el reporte:", error);
    res.status(500).json({ error: "Error interno al crear el reporte" });
  }
}

/**
 * GET /api/reportes
 * Lista los reportes, más recientes primero.
 * Acepta filtros opcionales por la URL: ?tipo=robo&gravedad=alta&estado=nuevo
 */
export async function listarReportes(req: Request, res: Response): Promise<void> {
  try {
    const { tipo, gravedad, estado } = req.query;

    // Armamos el filtro solo con los parámetros que realmente vengan en la URL.
    const filtro: {
      tipo?: IReporte["tipo"];
      gravedad?: IReporte["gravedad"];
      estado?: IReporte["estado"];
    } = {};
    if (typeof tipo === "string") filtro.tipo = tipo as IReporte["tipo"];
    if (typeof gravedad === "string") filtro.gravedad = gravedad as IReporte["gravedad"];
    if (typeof estado === "string") filtro.estado = estado as IReporte["estado"];

    const reportes = await Reporte.find(filtro)
      .sort({ createdAt: -1 }) // más recientes primero
      .limit(100); // tope de seguridad para la demo

    res.json({ total: reportes.length, reportes });
  } catch (error) {
    console.error("Error al listar los reportes:", error);
    res.status(500).json({ error: "Error interno al listar los reportes" });
  }
}
