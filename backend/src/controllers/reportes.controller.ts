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

/**
 * GET /api/reportes/cerca?lng=...&lat=...&radio=...
 * Devuelve los reportes dentro de un radio (en metros) de un punto,
 * ordenados del más cercano al más lejano. Usa el índice 2dsphere.
 * Filtros opcionales: tipo, desde, hasta (rango de fechaIncidente).
 */
export async function buscarReportesCerca(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { lng, lat, radio, tipo, desde, hasta } = req.query;

    const longitud = Number(lng);
    const latitud = Number(lat);

    // El centro de la búsqueda es obligatorio y debe ser válido.
    if (
      !Number.isFinite(longitud) ||
      !Number.isFinite(latitud) ||
      longitud < -180 ||
      longitud > 180 ||
      latitud < -90 ||
      latitud > 90
    ) {
      res.status(400).json({
        error: "Debes enviar 'lng' y 'lat' válidos. Ejemplo: ?lng=-74.08&lat=4.61",
      });
      return;
    }

    // Radio en metros (por defecto 1000 = 1 km).
    const radioMetros = radio !== undefined ? Number(radio) : 1000;
    if (!Number.isFinite(radioMetros) || radioMetros <= 0) {
      res.status(400).json({
        error: "El 'radio' debe ser un número de metros mayor que 0",
      });
      return;
    }

    // Rango opcional de fechas del incidente.
    const rangoFecha: { $gte?: Date; $lte?: Date } = {};
    if (typeof desde === "string") {
      const d = new Date(desde);
      if (!isNaN(d.getTime())) rangoFecha.$gte = d;
    }
    if (typeof hasta === "string") {
      const h = new Date(hasta);
      if (!isNaN(h.getTime())) rangoFecha.$lte = h;
    }

    // Filtro: condición geográfica + filtros opcionales.
    const filtro: {
      ubicacion: {
        $near: {
          $geometry: { type: "Point"; coordinates: [number, number] };
          $maxDistance: number;
        };
      };
      tipo?: IReporte["tipo"];
      fechaIncidente?: { $gte?: Date; $lte?: Date };
    } = {
      ubicacion: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitud, latitud] },
          $maxDistance: radioMetros,
        },
      },
    };
    if (typeof tipo === "string") filtro.tipo = tipo as IReporte["tipo"];
    if (Object.keys(rangoFecha).length > 0) filtro.fechaIncidente = rangoFecha;

    // $near ya entrega los resultados ordenados del más cercano al más lejano.
    const reportes = await Reporte.find(filtro).limit(100);

    res.json({
      centro: { longitud, latitud },
      radioMetros,
      total: reportes.length,
      reportes,
    });
  } catch (error) {
    console.error("Error en la búsqueda por cercanía:", error);
    res.status(500).json({ error: "Error interno en la búsqueda por cercanía" });
  }
}

/**
 * GET /api/reportes/estadisticas
 * Conteos de reportes por tipo, por gravedad y por estado, más el total.
 * Usa el pipeline de agregación de MongoDB con $facet, que corre varias
 * sub-tuberías ($group + $sort) en una sola consulta.
 */
export async function estadisticasReportes(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const [resultado] = await Reporte.aggregate([
      {
        $facet: {
          porTipo: [
            { $group: { _id: "$tipo", total: { $sum: 1 } } },
            { $sort: { total: -1 } },
          ],
          porGravedad: [{ $group: { _id: "$gravedad", total: { $sum: 1 } } }],
          porEstado: [{ $group: { _id: "$estado", total: { $sum: 1 } } }],
          total: [{ $count: "valor" }],
        },
      },
    ]);

    // $facet devuelve arrays; los dejamos en un formato cómodo para el frontend.
    res.json({
      total: resultado.total[0]?.valor ?? 0,
      porTipo: resultado.porTipo,
      porGravedad: resultado.porGravedad,
      porEstado: resultado.porEstado,
    });
  } catch (error) {
    console.error("Error al calcular las estadísticas:", error);
    res.status(500).json({ error: "Error interno al calcular las estadísticas" });
  }
}
