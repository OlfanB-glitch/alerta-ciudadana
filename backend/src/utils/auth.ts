import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "secreto_de_desarrollo_cambialo";
const SIETE_DIAS = 60 * 60 * 24 * 7; // duración del token, en segundos

if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️  JWT_SECRET no está definido en .env; se usa un valor por defecto (solo para desarrollo)."
  );
}

export type DatosToken = { id: string };

// Crea un token firmado que identifica al usuario.
export function firmarToken(usuarioId: string): string {
  return jwt.sign({ id: usuarioId }, SECRET, { expiresIn: SIETE_DIAS });
}

// Verifica un token y devuelve su contenido (lanza error si es inválido).
export function verificarToken(token: string): DatosToken {
  return jwt.verify(token, SECRET) as DatosToken;
}
