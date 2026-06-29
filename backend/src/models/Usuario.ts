import { Schema, model } from "mongoose";

// Roles posibles de un usuario.
export const ROLES = ["ciudadano", "autoridad", "admin"] as const;
export type Rol = (typeof ROLES)[number];

// Forma del documento de usuario en TypeScript.
export interface IUsuario {
  nombre: string;
  email: string;
  rol: Rol;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const usuarioSchema = new Schema<IUsuario>(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El email es obligatorio"],
      unique: true, // crea un índice único: no se pueden repetir emails
      lowercase: true,
      trim: true,
    },
    rol: {
      type: String,
      enum: { values: [...ROLES], message: "Rol no válido: {VALUE}" },
      default: "ciudadano",
    },
    passwordHash: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
      select: false, // no se devuelve en las consultas por defecto
    },
  },
  { timestamps: true }
);

export const Usuario = model<IUsuario>("Usuario", usuarioSchema);
