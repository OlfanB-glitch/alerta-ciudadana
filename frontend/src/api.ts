// Cliente del backend. Gracias al proxy de Vite, basta con llamar a "/api/...".

const BASE = "/api";

export type Gravedad = "baja" | "media" | "alta";
export type EstadoReporte = "nuevo" | "en_revision" | "resuelto" | "descartado";

// Listas para los desplegables del formulario (deben coincidir con el backend).
export const TIPOS = [
  "robo",
  "hurto_celular",
  "vandalismo",
  "riña",
  "actividad_sospechosa",
] as const;

export const GRAVEDADES: Gravedad[] = ["baja", "media", "alta"];

// La forma de un reporte tal como lo devuelve el backend.
export type Reporte = {
  _id: string;
  tipo: string;
  descripcion: string;
  gravedad: Gravedad;
  estado: EstadoReporte;
  ubicacion: { type: "Point"; coordinates: [number, number] }; // [longitud, latitud]
  direccionTexto?: string;
  fechaIncidente: string;
  createdAt: string;
  updatedAt: string;
};

// Los datos que enviamos al crear un reporte (longitud/latitud por separado).
export type NuevoReporte = {
  tipo: string;
  descripcion: string;
  gravedad?: Gravedad;
  longitud: number;
  latitud: number;
  direccionTexto?: string;
};

type RespuestaLista = { total: number; reportes: Reporte[] };

// Lee la respuesta; si el backend devolvió un error, lanza un mensaje claro en español.
async function manejarRespuesta<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const datos = await res.json().catch(() => ({}));
    const detalle =
      (Array.isArray(datos.detalles) && datos.detalles.join(", ")) ||
      datos.error ||
      res.statusText;
    throw new Error(detalle);
  }
  return res.json() as Promise<T>;
}

export async function listarReportes(): Promise<RespuestaLista> {
  const res = await fetch(`${BASE}/reportes`);
  return manejarRespuesta<RespuestaLista>(res);
}

export async function crearReporte(datos: NuevoReporte): Promise<Reporte> {
  const res = await fetch(`${BASE}/reportes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  return manejarRespuesta<Reporte>(res);
}
