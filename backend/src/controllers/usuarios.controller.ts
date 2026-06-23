import { Request, Response } from "express";
import mongoose from "mongoose";
import { Usuario } from "../models/Usuario";

/**
 * POST /api/usuarios
 * Crea un usuario (nombre, email único, rol).
 */
export async function crearUsuario(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, email, rol } = req.body;
    const usuario = await Usuario.create({ nombre, email, rol });
    res.status(201).json(usuario);
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
    console.error("Error al crear el usuario:", error);
    res.status(500).json({ error: "Error interno al crear el usuario" });
  }
}

/**
 * GET /api/usuarios
 * Lista los usuarios ordenados por nombre.
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
