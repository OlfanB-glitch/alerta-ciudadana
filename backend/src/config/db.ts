import mongoose from "mongoose";

/**
 * Conecta a MongoDB Atlas usando la cadena de conexión guardada en .env (MONGODB_URI).
 * Si la variable no existe o la conexión falla, detenemos el proceso:
 * sin base de datos no tiene sentido que el servidor siga corriendo.
 */
export async function conectarBaseDeDatos(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("❌ Falta la variable MONGODB_URI en el archivo .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ Conexión a MongoDB Atlas exitosa");
  } catch (error) {
    console.error("❌ No se pudo conectar a MongoDB Atlas:", error);
    process.exit(1);
  }
}
