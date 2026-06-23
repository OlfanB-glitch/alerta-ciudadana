import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { conectarBaseDeDatos } from "./config/db";

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares básicos
app.use(cors()); // permite que el frontend (otro origen) llame a la API
app.use(express.json()); // entiende cuerpos de petición en formato JSON

/**
 * Endpoint de salud: confirma que el servidor está vivo
 * y si la base de datos está conectada.
 * readyState === 1 significa "conectado".
 */
app.get("/api/salud", (_req, res) => {
  const baseDeDatosConectada = mongoose.connection.readyState === 1;
  res.json({
    estado: "ok",
    mensaje: "El servidor de Alerta Ciudadana está funcionando",
    baseDeDatos: baseDeDatosConectada ? "conectada" : "desconectada",
    fecha: new Date().toISOString(),
  });
});

/**
 * Arranque: primero conectamos a MongoDB y, solo si funciona,
 * levantamos el servidor HTTP.
 */
async function iniciar() {
  await conectarBaseDeDatos();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
    console.log(`   Prueba de salud: http://localhost:${PORT}/api/salud`);
  });
}

iniciar();
