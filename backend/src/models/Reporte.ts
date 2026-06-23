import { Schema, model, Types } from "mongoose";

// ===== Listas cerradas (enums) =====
// Las definimos una sola vez y las reutilizamos en TypeScript y en la validación.
export const TIPOS = [
  "robo",
  "hurto_celular",
  "vandalismo",
  "riña",
  "actividad_sospechosa",
] as const;

export const GRAVEDADES = ["baja", "media", "alta"] as const;

export const ESTADOS = ["nuevo", "en_revision", "resuelto", "descartado"] as const;

// Tipos de TypeScript derivados de las listas de arriba.
export type TipoReporte = (typeof TIPOS)[number];
export type Gravedad = (typeof GRAVEDADES)[number];
export type EstadoReporte = (typeof ESTADOS)[number];

// ===== Forma del documento en TypeScript =====
export interface IReporte {
  tipo: TipoReporte;
  descripcion: string;
  gravedad: Gravedad;
  estado: EstadoReporte;
  ubicacion: {
    type: "Point";
    coordinates: [number, number]; // [longitud, latitud]  ← ¡ojo el orden!
  };
  direccionTexto?: string;
  fechaIncidente: Date;
  reportadoPor?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ===== Sub-esquema de ubicación (GeoJSON Point) =====
const ubicacionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitud, latitud]  ← ¡ojo el orden!
      required: [true, "Las coordenadas de la ubicación son obligatorias"],
      validate: {
        validator: (coords: number[]) =>
          Array.isArray(coords) &&
          coords.length === 2 &&
          coords[0] >= -180 &&
          coords[0] <= 180 && // longitud
          coords[1] >= -90 &&
          coords[1] <= 90, // latitud
        message:
          "Las coordenadas deben ser [longitud, latitud] con valores válidos",
      },
    },
  },
  { _id: false } // el subdocumento no necesita su propio _id
);

// ===== Esquema principal del reporte =====
const reporteSchema = new Schema<IReporte>(
  {
    tipo: {
      type: String,
      enum: { values: [...TIPOS], message: "Tipo de incidente no válido: {VALUE}" },
      required: [true, "El tipo de incidente es obligatorio"],
    },
    descripcion: {
      type: String,
      required: [true, "La descripción es obligatoria"],
      trim: true,
      minlength: [5, "La descripción debe tener al menos 5 caracteres"],
    },
    gravedad: {
      type: String,
      enum: { values: [...GRAVEDADES], message: "Gravedad no válida: {VALUE}" },
      default: "media",
    },
    estado: {
      type: String,
      enum: { values: [...ESTADOS], message: "Estado no válido: {VALUE}" },
      default: "nuevo",
    },
    ubicacion: {
      type: ubicacionSchema,
      required: [true, "La ubicación es obligatoria"],
    },
    direccionTexto: {
      type: String,
      trim: true,
    },
    fechaIncidente: {
      type: Date,
      default: Date.now,
    },
    reportadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Usuario", // referencia a la (futura) colección de usuarios
    },
  },
  {
    timestamps: true, // crea y mantiene createdAt y updatedAt automáticamente
  }
);

// Índice geoespacial: necesario para las búsquedas "cerca de aquí" (por radio).
// Mongoose lo crea automáticamente en Atlas al arrancar el servidor.
reporteSchema.index({ ubicacion: "2dsphere" });

export const Reporte = model<IReporte>("Reporte", reporteSchema);
