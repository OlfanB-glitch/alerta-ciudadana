import { Router } from "express";
import {
  crearReporte,
  listarReportes,
  buscarReportesCerca,
  estadisticasReportes,
  actualizarEstadoReporte,
  eliminarReporte,
  listarReportesConUsuario,
} from "../controllers/reportes.controller";
import { autenticar } from "../middleware/autenticar";

const router = Router();

// Rutas públicas (consulta): cualquiera puede ver los reportes.
router.get("/cerca", buscarReportesCerca); // GET /api/reportes/cerca (búsqueda por radio)
router.get("/estadisticas", estadisticasReportes); // GET /api/reportes/estadisticas
router.get("/con-usuario", listarReportesConUsuario); // GET /api/reportes/con-usuario ($lookup)
router.get("/", listarReportes); // GET  /api/reportes

// Rutas protegidas (requieren iniciar sesión): crear, cambiar estado y eliminar.
router.post("/", autenticar, crearReporte); // POST /api/reportes
router.patch("/:id", autenticar, actualizarEstadoReporte); // PATCH /api/reportes/:id
router.delete("/:id", autenticar, eliminarReporte); // DELETE /api/reportes/:id

export default router;
