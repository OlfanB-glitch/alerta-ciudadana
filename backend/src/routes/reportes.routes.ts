import { Router } from "express";
import { crearReporte, listarReportes } from "../controllers/reportes.controller";

const router = Router();

// Estas rutas se montan bajo "/api/reportes" (ver index.ts).
router.post("/", crearReporte); // POST /api/reportes
router.get("/", listarReportes); // GET  /api/reportes

export default router;
