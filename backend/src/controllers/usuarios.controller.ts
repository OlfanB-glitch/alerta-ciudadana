import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Usuario } from "../models/Usuario";
import { firmarToken } from "../utils/auth";

// Devuelve los datos públicos del usuario (sin la contraseña).
function datosPublicos(usuario: {
  _id: unknown;
  nombre: string;
  email: string;
  rol: string;
}) {
  return {
    _id: usuario._id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };
}

/**
 * POST /api/usuarios/registro
 * Crea una cuenta (nombre, email único, contraseña) y devuelve un token de sesión.
 */
export async function registrarUsuario(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, email, password, rol } = req.body;
    if (typeof password !== "string" || password.length < 6) {
      res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await Usuario.create({ nombre, email, rol, passwordHash });

    const token = firmarToken(String(usuario._id));
    res.status(201).json({ token, usuario: datosPublicos(usuario) });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const detalles = Object.values(error.errors).map((e) => e.message);
      res.status(400).json({ error: "Datos inválidos", detalles });
      return;
    }
    // Error 11000 = clave duplicada (el índice único del email).
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: number }).code === 11000
    ) {
      res.status(400).json({ error: "Ese email ya está registrado" });
      return;
    }
    console.error("Error al registrar el usuario:", error);
    res.status(500).json({ error: "Error interno al registrar el usuario" });
  }
}

/**
 * POST /api/usuarios/login
 * Verifica las credenciales y devuelve un token de sesión.
 */
export async function iniciarSesion(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "Debes enviar email y contraseña" });
      return;
    }

    // Pedimos explícitamente el passwordHash (el esquema lo oculta por defecto).
    const usuario = await Usuario.findOne({ email: email.toLowerCase() }).select(
      "+passwordHash"
    );
    if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
      res.status(401).json({ error: "Email o contraseña incorrectos" });
      return;
    }

    const token = firmarToken(String(usuario._id));
    res.json({ token, usuario: datosPublicos(usuario) });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    res.status(500).json({ error: "Error interno al iniciar sesión" });
  }
}

/**
 * GET /api/usuarios
 * Lista los usuarios (sin contraseñas), ordenados por nombre.
 */
export async function listarUsuarios(_req: Request, res: Response): Promise<void> {
  try {
    const usuarios = await Usuario.find().sort({ nombre: 1 });
    res.json({ total: usuarios.length, usuarios });
  } catch (error) {
    console.error("Error al listar los usuarios:", error);
    res.status(500).json({ error: "Error interno al listar los usuarios" });
  }
}
