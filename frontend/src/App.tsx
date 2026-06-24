import { useEffect, useState, type FormEvent } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import {
  listarReportesConUsuario,
  buscarReportesCerca,
  crearReporte,
  obtenerEstadisticas,
  actualizarEstado,
  eliminarReporte,
  listarUsuarios,
  TIPOS,
  GRAVEDADES,
  ESTADOS,
  type Reporte,
  type Gravedad,
  type EstadoReporte,
  type Estadisticas,
  type Usuario,
} from "./api";

// Centro del mapa: Villavicencio, Meta (Colombia). Leaflet usa [lat, lng].
const VILLAVICENCIO: [number, number] = [4.142, -73.626];

// Colores tipo semáforo según la gravedad.
const COLOR_GRAVEDAD: Record<Gravedad, string> = {
  baja: "#2e7d32", // verde
  media: "#f9a825", // amarillo
  alta: "#c62828", // rojo
};

// Etiquetas legibles para el desplegable y las estadísticas.
const ETIQUETA_TIPO: Record<string, string> = {
  robo: "Robo",
  hurto_celular: "Hurto de celular",
  vandalismo: "Vandalismo",
  riña: "Riña",
  actividad_sospechosa: "Actividad sospechosa",
};

type Punto = { lat: number; lng: number };
type Circulo = { lat: number; lng: number; radio: number };

// Carga las estadísticas del backend y las entrega al setter.
function cargarEstadisticas(set: (e: Estadisticas) => void) {
  obtenerEstadisticas()
    .then(set)
    .catch(() => {
      // Si fallan las estadísticas, no rompemos el resto de la página.
    });
}

// Componente invisible que escucha los clics en el mapa.
function SelectorDeUbicacion({ onElegir }: { onElegir: (p: Punto) => void }) {
  useMapEvents({
    click(e) {
      onElegir({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function App() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado del formulario.
  const [punto, setPunto] = useState<Punto | null>(null);
  const [tipo, setTipo] = useState<string>(TIPOS[0]);
  const [descripcion, setDescripcion] = useState("");
  const [gravedad, setGravedad] = useState<Gravedad>("media");
  const [reportadoPor, setReportadoPor] = useState(""); // "" = anónimo
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Estado de la búsqueda por zona.
  const [radio, setRadio] = useState(2000);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [circulo, setCirculo] = useState<Circulo | null>(null);

  // Trae todos los reportes (con su autor unido vía $lookup).
  function refrescarReportes() {
    listarReportesConUsuario()
      .then((data) => setReportes(data.reportes))
      .catch((e) => setError(e.message));
  }

  // Al montar la página: reportes, estadísticas y usuarios.
  useEffect(() => {
    refrescarReportes();
    cargarEstadisticas(setEstadisticas);
    listarUsuarios()
      .then((data) => setUsuarios(data.usuarios))
      .catch(() => {});
  }, []);

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    if (!punto) return;

    setEnviando(true);
    setMensaje(null);
    try {
      await crearReporte({
        tipo,
        descripcion,
        gravedad,
        longitud: punto.lng,
        latitud: punto.lat,
        reportadoPor: reportadoPor || undefined,
      });
      // Volvemos a la vista completa con el nuevo reporte incluido.
      setCirculo(null);
      refrescarReportes();
      cargarEstadisticas(setEstadisticas);
      setMensaje("✅ Reporte creado");
      setDescripcion("");
      setPunto(null);
    } catch (err) {
      setMensaje("⚠️ " + (err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  // Busca los reportes dentro del radio alrededor del punto elegido.
  async function buscarPorZona() {
    if (!punto) return;
    try {
      const data = await buscarReportesCerca(
        punto.lng,
        punto.lat,
        radio,
        filtroTipo || undefined
      );
      setReportes(data.reportes);
      setCirculo({ lat: punto.lat, lng: punto.lng, radio });
      setMensaje(`🔎 ${data.reportes.length} reporte(s) dentro de ${radio} m`);
    } catch (err) {
      setMensaje("⚠️ " + (err as Error).message);
    }
  }

  // Vuelve a mostrar todos los reportes.
  function verTodos() {
    setCirculo(null);
    setMensaje(null);
    refrescarReportes();
  }

  // Cambia el estado de un reporte y refleja el cambio en el mapa.
  async function cambiarEstado(id: string, estado: EstadoReporte) {
    try {
      const actualizado = await actualizarEstado(id, estado);
      // Conservamos el autor y la distancia (el PATCH no los devuelve).
      setReportes((prev) =>
        prev.map((r) =>
          r._id === id
            ? { ...actualizado, usuario: r.usuario, distanciaMetros: r.distanciaMetros }
            : r
        )
      );
      cargarEstadisticas(setEstadisticas);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // Elimina un reporte y lo quita del mapa.
  async function borrarReporte(id: string) {
    try {
      await eliminarReporte(id);
      setReportes((prev) => prev.filter((r) => r._id !== id));
      cargarEstadisticas(setEstadisticas);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="app">
      <header className="cabecera">
        <h1>Alerta Ciudadana — Villavicencio</h1>
        <div className="leyenda">
          <span>
            <i style={{ background: COLOR_GRAVEDAD.baja }} /> Baja
          </span>
          <span>
            <i style={{ background: COLOR_GRAVEDAD.media }} /> Media
          </span>
          <span>
            <i style={{ background: COLOR_GRAVEDAD.alta }} /> Alta
          </span>
          <strong>{reportes.length} reportes</strong>
        </div>
        {error && <p className="error">Error: {error}</p>}
      </header>

      <div className="contenido">
        <aside className="panel">
          <h2>Nuevo reporte</h2>
          <p className="ayuda">
            {punto
              ? `Punto elegido: ${punto.lat.toFixed(4)}, ${punto.lng.toFixed(4)}`
              : "Haz clic en el mapa para elegir el lugar."}
          </p>

          <form onSubmit={manejarEnvio}>
            <label className="campo">
              Tipo
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETA_TIPO[t]}
                  </option>
                ))}
              </select>
            </label>

            <label className="campo">
              Gravedad
              <select
                value={gravedad}
                onChange={(e) => setGravedad(e.target.value as Gravedad)}
              >
                {GRAVEDADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>

            <label className="campo">
              Reportado por
              <select
                value={reportadoPor}
                onChange={(e) => setReportadoPor(e.target.value)}
              >
                <option value="">Anónimo</option>
                {usuarios.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="campo">
              Descripción
              <textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="¿Qué pasó? (mínimo 5 caracteres)"
              />
            </label>

            <button type="submit" disabled={!punto || enviando}>
              {enviando ? "Enviando…" : "Crear reporte"}
            </button>
          </form>

          {mensaje && <p className="mensaje">{mensaje}</p>}

          <section className="busqueda">
            <h2>Buscar por zona</h2>
            <p className="ayuda">
              {punto
                ? "Centro: el punto elegido en el mapa."
                : "Haz clic en el mapa para fijar el centro."}
            </p>

            <label className="campo">
              Radio (metros)
              <input
                type="number"
                min={100}
                step={100}
                value={radio}
                onChange={(e) => setRadio(Number(e.target.value))}
              />
            </label>

            <label className="campo">
              Tipo (opcional)
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="">Todos</option>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETA_TIPO[t]}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={buscarPorZona} disabled={!punto}>
              Buscar por zona
            </button>
            {circulo && (
              <button
                type="button"
                onClick={verTodos}
                style={{ marginTop: 8, background: "#6b7280" }}
              >
                Ver todos
              </button>
            )}
          </section>

          {estadisticas && (
            <section className="estadisticas">
              <h2>Estadísticas</h2>
              <p>
                Total: <strong>{estadisticas.total}</strong>
              </p>

              <h3>Por gravedad</h3>
              <ul>
                {estadisticas.porGravedad.map((c) => (
                  <li key={c._id}>
                    <i style={{ background: COLOR_GRAVEDAD[c._id as Gravedad] }} />
                    {c._id}: {c.total}
                  </li>
                ))}
              </ul>

              <h3>Por tipo</h3>
              <ul>
                {estadisticas.porTipo.map((c) => (
                  <li key={c._id}>
                    {ETIQUETA_TIPO[c._id] ?? c._id}: {c.total}
                  </li>
                ))}
              </ul>

              <h3>Por estado</h3>
              <ul>
                {estadisticas.porEstado.map((c) => (
                  <li key={c._id}>
                    {c._id}: {c.total}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <MapContainer center={VILLAVICENCIO} zoom={13} className="mapa">
          <TileLayer
            attribution="&copy; colaboradores de OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <SelectorDeUbicacion onElegir={setPunto} />

          {/* Círculo que muestra la zona buscada (radio). */}
          {circulo && (
            <Circle
              center={[circulo.lat, circulo.lng]}
              radius={circulo.radio}
              pathOptions={{ color: "#1565c0", fillOpacity: 0.05 }}
            />
          )}

          {/* Marcador temporal del punto que el usuario está eligiendo. */}
          {punto && (
            <CircleMarker
              center={[punto.lat, punto.lng]}
              radius={8}
              pathOptions={{ color: "#1565c0", fillColor: "#1565c0", fillOpacity: 0.5 }}
            >
              <Popup>Punto elegido (crear o buscar por zona)</Popup>
            </CircleMarker>
          )}

          {reportes.map((r) => {
            // GeoJSON guarda [longitud, latitud]; Leaflet pide [latitud, longitud].
            const [lng, lat] = r.ubicacion.coordinates;
            return (
              <CircleMarker
                key={r._id}
                center={[lat, lng]}
                radius={10}
                pathOptions={{
                  color: COLOR_GRAVEDAD[r.gravedad],
                  fillColor: COLOR_GRAVEDAD[r.gravedad],
                  fillOpacity: 0.7,
                }}
              >
                <Popup>
                  <strong>{r.tipo}</strong>
                  <br />
                  {r.descripcion}
                  <br />
                  <em>Gravedad: {r.gravedad}</em>
                  <br />
                  {typeof r.distanciaMetros === "number" && (
                    <>
                      <small>A {Math.round(r.distanciaMetros)} m del centro</small>
                      <br />
                    </>
                  )}
                  <label>
                    Estado:{" "}
                    <select
                      value={r.estado}
                      onChange={(e) =>
                        cambiarEstado(r._id, e.target.value as EstadoReporte)
                      }
                    >
                      {ESTADOS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <br />
                  <small>Por: {r.usuario ? r.usuario.nombre : "Anónimo"}</small>
                  <br />
                  <button
                    type="button"
                    onClick={() => borrarReporte(r._id)}
                    style={{ marginTop: 6, color: "#c62828", cursor: "pointer" }}
                  >
                    Eliminar
                  </button>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
