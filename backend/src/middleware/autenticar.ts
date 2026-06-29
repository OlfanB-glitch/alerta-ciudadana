import { Request, Response, NextFunction } from "express";
import { verificarToken } from "../utils/auth";

/**
 * Middleware de autenticación: exige un token válido en la cabecera
 * "Authorization: Bearer <token>". Si es válido, guarda el id del usuario
 * en req.usuarioId; si no, responde 401.
 */
export function autenticar(req: Request, res: Response, next: NextFunction): void {
  const encabezado = req.headers.authorization;
  if (!encabezado || !encabezado.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autenticado. Inicia sesión." });
    return;
  }

  const token = encabezado.slice(7); // quita el prefijo "Bearer "
  try {
    const { id } = verificarToken(token);
    req.usuarioId = id;
    next();
  } catch {
    res
      .status(401)
      .json({ error: "Sesión inválida o expirada. Inicia sesión de nuevo." });
  }
}
