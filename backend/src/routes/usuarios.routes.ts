import { Router } from "express";
import { crearUsuario, listarUsuarios } from "../controllers/usuarios.controller";

const router = Router();

// Estas rutas se montan bajo "/api/usuarios" (ver index.ts).
router.post("/", crearUsuario); // POST /api/usuarios
router.get("/", listarUsuarios); // GET  /api/usuarios

export default router;
