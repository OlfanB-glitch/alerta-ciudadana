import { useEffect, useState, type FormEvent } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import {
  listarReportes,
  crearReporte,
  obtenerEstadisticas,
  TIPOS,
  GRAVEDADES,
  type Reporte,
  type Gravedad,
  type Estadisticas,
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
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado del formulario.
  const [punto, setPunto] = useState<Punto | null>(null);
  const [tipo, setTipo] = useState<string>(TIPOS[0]);
  const [descripcion, setDescripcion] = useState("");
  const [gravedad, setGravedad] = useState<Gravedad>("media");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Al montar la página, pedimos los reportes y las estadísticas al backend.
  useEffect(() => {
    listarReportes()
      .then((data) => setReportes(data.reportes))
      .catch((e) => setError(e.message));
    cargarEstadisticas(setEstadisticas);
  }, []);

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    if (!punto) return;

    setEnviando(true);
    setMensaje(null);
    try {
      const nuevo = await crearReporte({
        tipo,
        descripcion,
        gravedad,
        longitud: punto.lng,
        latitud: punto.lat,
      });
      // Lo agregamos al mapa al instante y refrescamos las estadísticas.
      setReportes((prev) => [nuevo, ...prev]);
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

          {/* Marcador temporal del punto que el usuario está eligiendo. */}
          {punto && (
            <CircleMarker
              center={[punto.lat, punto.lng]}
              radius={8}
              pathOptions={{ color: "#1565c0", fillColor: "#1565c0", fillOpacity: 0.5 }}
            >
              <Popup>Aquí se creará el reporte</Popup>
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
                  <small>Estado: {r.estado}</small>
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
