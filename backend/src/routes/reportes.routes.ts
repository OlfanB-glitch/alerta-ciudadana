import { Router } from "express";
import {
  crearReporte,
  listarReportes,
  buscarReportesCerca,
  estadisticasReportes,
} from "../controllers/reportes.controller";

const router = Router();

// Estas rutas se montan bajo "/api/reportes" (ver index.ts).
router.post("/", crearReporte); // POST /api/reportes
router.get("/cerca", buscarReportesCerca); // GET /api/reportes/cerca (búsqueda por radio)
router.get("/estadisticas", estadisticasReportes); // GET /api/reportes/estadisticas
router.get("/", listarReportes); // GET  /api/reportes

export default router;
