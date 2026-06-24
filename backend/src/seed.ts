import "dotenv/config";
import mongoose from "mongoose";
import { conectarBaseDeDatos } from "./config/db";
import { Reporte } from "./models/Reporte";
import { Usuario } from "./models/Usuario";

/**
 * Script de "seed": deja la base de datos con un estado de demo predecible.
 * ⚠️ VACÍA las colecciones reportes y usuarios antes de insertar los ejemplos.
 * Ejecutar con: npm run seed
 */
async function sembrar() {
  await conectarBaseDeDatos();

  await Reporte.deleteMany({});
  await Usuario.deleteMany({});
  console.log("🧹 Colecciones 'reportes' y 'usuarios' vaciadas");

  const [ciudadano, autoridad] = await Usuario.create([
    { nombre: "Olfan Beltrán", email: "olfan@ejemplo.com", rol: "ciudadano" },
    { nombre: "Autoridad Local", email: "autoridad@villavo.gov.co", rol: "autoridad" },
  ]);
  console.log("👥 2 usuarios creados");

  // Reportes de ejemplo en Villavicencio. Coordenadas GeoJSON: [longitud, latitud].
  await Reporte.create([
    {
      tipo: "robo",
      descripcion: "Robo de celular cerca del parque principal",
      gravedad: "alta",
      estado: "nuevo",
      ubicacion: { type: "Point", coordinates: [-73.6266, 4.142] },
      reportadoPor: ciudadano._id,
    },
    {
      tipo: "hurto_celular",
      descripcion: "Hurto a la salida del centro comercial",
      gravedad: "media",
      estado: "en_revision",
      ubicacion: { type: "Point", coordinates: [-73.631, 4.1455] },
      reportadoPor: ciudadano._id,
    },
    {
      tipo: "vandalismo",
      descripcion: "Daños a un paradero de buses",
      gravedad: "baja",
      estado: "resuelto",
      ubicacion: { type: "Point", coordinates: [-73.62, 4.139] },
      reportadoPor: autoridad._id,
    },
    {
      tipo: "riña",
      descripcion: "Riña a la salida de un bar en la noche",
      gravedad: "alta",
      estado: "nuevo",
      ubicacion: { type: "Point", coordinates: [-73.618, 4.15] },
    },
    {
      tipo: "actividad_sospechosa",
      descripcion: "Persona merodeando viviendas en el barrio",
      gravedad: "media",
      estado: "nuevo",
      ubicacion: { type: "Point", coordinates: [-73.635, 4.138] },
      reportadoPor: ciudadano._id,
    },
  ]);
  console.log("📍 5 reportes creados en Villavicencio");

  await mongoose.disconnect();
  console.log("✅ Seed completado. Conexión cerrada.");
}

sembrar().catch((error) => {
  console.error("❌ Error en el seed:", error);
  process.exit(1);
});
