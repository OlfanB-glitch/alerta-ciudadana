import { Router } from "express";
import {
  registrarUsuario,
  iniciarSesion,
  listarUsuarios,
} from "../controllers/usuarios.controller";

const router = Router();

// Estas rutas se montan bajo "/api/usuarios" (ver index.ts).
router.post("/registro", registrarUsuario); // POST /api/usuarios/registro
router.post("/login", iniciarSesion); // POST /api/usuarios/login
router.get("/", listarUsuarios); // GET  /api/usuarios

export default router;
