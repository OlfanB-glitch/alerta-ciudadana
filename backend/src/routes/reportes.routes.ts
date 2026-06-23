import { Router } from "express";
import {
  crearReporte,
  listarReportes,
  buscarReportesCerca,
  estadisticasReportes,
  actualizarEstadoReporte,
  eliminarReporte,
} from "../controllers/reportes.controller";

const router = Router();

// Estas rutas se montan bajo "/api/reportes" (ver index.ts).
router.post("/", crearReporte); // POST /api/reportes
router.get("/cerca", buscarReportesCerca); // GET /api/reportes/cerca (búsqueda por radio)
router.get("/estadisticas", estadisticasReportes); // GET /api/reportes/estadisticas
router.get("/", listarReportes); // GET  /api/reportes
router.patch("/:id", actualizarEstadoReporte); // PATCH  /api/reportes/:id (cambiar estado)
router.delete("/:id", eliminarReporte); // DELETE /api/reportes/:id

export default router;
