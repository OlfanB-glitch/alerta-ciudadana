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

export const ESTADOS: EstadoReporte[] = [
  "nuevo",
  "en_revision",
  "resuelto",
  "descartado",
];

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
  reportadoPor?: string; // id del autor (en la lista normal)
  usuario?: { _id: string; nombre: string; email: string } | null; // autor unido vía $lookup
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
  reportadoPor?: string; // id del usuario autor (opcional)
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

// Un conteo: _id es el valor agrupado (p. ej. "robo") y total cuántos hay.
export type Conteo = { _id: string; total: number };

export type Estadisticas = {
  total: number;
  porTipo: Conteo[];
  porGravedad: Conteo[];
  porEstado: Conteo[];
};

export async function obtenerEstadisticas(): Promise<Estadisticas> {
  const res = await fetch(`${BASE}/reportes/estadisticas`);
  return manejarRespuesta<Estadisticas>(res);
}

// Cambia el estado de un reporte (PATCH) y devuelve el reporte actualizado.
export async function actualizarEstado(
  id: string,
  estado: EstadoReporte
): Promise<Reporte> {
  const res = await fetch(`${BASE}/reportes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
  return manejarRespuesta<Reporte>(res);
}

// Elimina un reporte por su id (DELETE).
export async function eliminarReporte(id: string): Promise<void> {
  const res = await fetch(`${BASE}/reportes/${id}`, { method: "DELETE" });
  await manejarRespuesta<{ mensaje: string }>(res);
}

export type Usuario = {
  _id: string;
  nombre: string;
  email: string;
  rol: string;
};

export async function listarUsuarios(): Promise<{
  total: number;
  usuarios: Usuario[];
}> {
  const res = await fetch(`${BASE}/usuarios`);
  return manejarRespuesta(res);
}

// Lista los reportes con su autor incrustado (usa $lookup en el backend).
export async function listarReportesConUsuario(): Promise<RespuestaLista> {
  const res = await fetch(`${BASE}/reportes/con-usuario`);
  return manejarRespuesta<RespuestaLista>(res);
}
