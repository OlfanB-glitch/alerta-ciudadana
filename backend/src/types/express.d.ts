// Añade el id del usuario autenticado al objeto Request de Express,
// para poder leer req.usuarioId en los controladores protegidos.
declare global {
  namespace Express {
    interface Request {
      usuarioId?: string;
    }
  }
}

export {};
