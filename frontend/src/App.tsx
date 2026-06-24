import { useEffect, useState, type FormEvent } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Circle,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
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

const COLOR_GRAVEDAD: Record<Gravedad, string> = {
  baja: "#16a34a",
  media: "#f59e0b",
  alta: "#e11d48",
};

const EMOJI_GRAVEDAD: Record<Gravedad, string> = {
  baja: "🟢",
  media: "🟡",
  alta: "🔴",
};

const ETIQUETA_TIPO: Record<string, string> = {
  robo: "Robo",
  hurto_celular: "Hurto de celular",
  vandalismo: "Vandalismo",
  riña: "Riña",
  actividad_sospechosa: "Actividad sospechosa",
};

const ICONO_TIPO: Record<string, string> = {
  robo: "🦹",
  hurto_celular: "📱",
  vandalismo: "🧱",
  riña: "🥊",
  actividad_sospechosa: "👀",
};

type Punto = { lat: number; lng: number };
type Circulo = { lat: number; lng: number; radio: number };
type Vista = "inicio" | "nuevo" | "mapa" | "estadisticas" | "consejos" | "ayuda";

const NAV: { id: Vista; icono: string; texto: string }[] = [
  { id: "inicio", icono: "🏠", texto: "Inicio" },
  { id: "nuevo", icono: "➕", texto: "Nuevo reporte" },
  { id: "mapa", icono: "🗺️", texto: "Mapa" },
  { id: "estadisticas", icono: "📊", texto: "Estadísticas" },
  { id: "consejos", icono: "🛡️", texto: "Consejos" },
  { id: "ayuda", icono: "❓", texto: "Ayuda" },
];

// Pin del mapa con el icono del tipo y el color de la gravedad.
function pinReporte(tipo: string, color: string) {
  const icono = ICONO_TIPO[tipo] ?? "📍";
  return L.divIcon({
    className: "pin-wrap",
    html: `<div class="pin" style="--c:${color}"><span>${icono}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 40],
    popupAnchor: [0, -36],
  });
}

// Pin azul para el punto que el usuario está eligiendo.
function pinElegido() {
  return L.divIcon({
    className: "pin-wrap",
    html: `<div class="pin" style="--c:#2563eb"><span>📍</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 40],
    popupAnchor: [0, -36],
  });
}

function cargarEstadisticas(set: (e: Estadisticas) => void) {
  obtenerEstadisticas()
    .then(set)
    .catch(() => {});
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

// Vuela el mapa hacia un destino (p. ej. la ubicación actual del usuario).
function VolarA({ destino }: { destino: Punto | null }) {
  const map = useMap();
  useEffect(() => {
    if (destino) map.flyTo([destino.lat, destino.lng], 16);
  }, [destino, map]);
  return null;
}

// Barra lateral de navegación.
function Sidebar({ vista, onCambiar }: { vista: Vista; onCambiar: (v: Vista) => void }) {
  return (
    <aside className="sidebar">
      <div className="logo">🛡️</div>
      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${vista === item.id ? "activo" : ""}`}
            onClick={() => onCambiar(item.id)}
          >
            <span className="nav-ico">{item.icono}</span>
            <span className="nav-txt">{item.texto}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

// Barra superior con título, chips de gravedad, campana y avatar.
function Topbar({ total }: { total: number }) {
  return (
    <header className="topbar">
      <div className="tb-fila">
        <div className="tb-titulo">
          <h1>Alerta Ciudadana</h1>
          <p className="sub">📍 Villavicencio, Meta</p>
        </div>
        <div className="tb-acciones">
          <button className="campana" aria-label="Notificaciones">
            🔔
            {total > 0 && <span className="punto-noti">{total}</span>}
          </button>
          <div className="avatar">AC</div>
        </div>
      </div>
      <div className="tb-chips">
        <span className="chip">
          <i style={{ background: COLOR_GRAVEDAD.baja }} /> Baja
        </span>
        <span className="chip">
          <i style={{ background: COLOR_GRAVEDAD.media }} /> Media
        </span>
        <span className="chip">
          <i style={{ background: COLOR_GRAVEDAD.alta }} /> Alta
        </span>
        <span className="badge-total">{total} reportes</span>
      </div>
    </header>
  );
}

function App() {
  const [vista, setVista] = useState<Vista>("inicio");
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulario.
  const [punto, setPunto] = useState<Punto | null>(null);
  const [tipo, setTipo] = useState<string>(TIPOS[0]);
  const [descripcion, setDescripcion] = useState("");
  const [gravedad, setGravedad] = useState<Gravedad>("media");
  const [reportadoPor, setReportadoPor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [centrarEn, setCentrarEn] = useState<Punto | null>(null);

  // Búsqueda por zona.
  const [radio, setRadio] = useState(2000);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [circulo, setCirculo] = useState<Circulo | null>(null);

  function refrescarReportes() {
    listarReportesConUsuario()
      .then((data) => setReportes(data.reportes))
      .catch((e) => setError(e.message));
  }

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
      setCirculo(null);
      refrescarReportes();
      cargarEstadisticas(setEstadisticas);
      setDescripcion("");
      setPunto(null);
      setCentrarEn(null);
      setMensaje(null);
      setVista("mapa"); // vamos al mapa para ver el nuevo reporte
    } catch (err) {
      setMensaje("⚠️ " + (err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  function cancelarForm() {
    setDescripcion("");
    setPunto(null);
    setCentrarEn(null);
    setMensaje(null);
    setVista("inicio");
  }

  // Usa la ubicación actual del dispositivo (GPS / navegador).
  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setMensaje("⚠️ Tu navegador no permite obtener la ubicación.");
      return;
    }
    setUbicando(true);
    setMensaje(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPunto(p);
        setCentrarEn(p);
        setUbicando(false);
      },
      (err) => {
        const motivos: Record<number, string> = {
          1: "Permiso de ubicación denegado. Actívalo en el navegador.",
          2: "No se pudo determinar tu ubicación.",
          3: "La ubicación tardó demasiado. Inténtalo de nuevo.",
        };
        setMensaje("⚠️ " + (motivos[err.code] ?? "No se pudo obtener tu ubicación."));
        setUbicando(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

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
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function verTodos() {
    setCirculo(null);
    refrescarReportes();
  }

  async function cambiarEstado(id: string, estado: EstadoReporte) {
    try {
      const actualizado = await actualizarEstado(id, estado);
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

  async function borrarReporte(id: string) {
    try {
      await eliminarReporte(id);
      setReportes((prev) => prev.filter((r) => r._id !== id));
      cargarEstadisticas(setEstadisticas);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // Marcadores de reportes (compartidos por el mapa grande).
  const marcadores = reportes.map((r) => {
    const [lng, lat] = r.ubicacion.coordinates;
    return (
      <Marker
        key={r._id}
        position={[lat, lng]}
        icon={pinReporte(r.tipo, COLOR_GRAVEDAD[r.gravedad])}
      >
        <Popup>
          <div className="popup-tipo">
            {ICONO_TIPO[r.tipo] ?? "📍"} {ETIQUETA_TIPO[r.tipo] ?? r.tipo}
          </div>
          <span className="popup-sev" style={{ background: COLOR_GRAVEDAD[r.gravedad] }}>
            {r.gravedad}
          </span>
          <div className="popup-fila">{r.descripcion}</div>
          {typeof r.distanciaMetros === "number" && (
            <div className="popup-fila">
              📏 A {Math.round(r.distanciaMetros)} m del centro
            </div>
          )}
          <label className="campo" style={{ margin: "8px 0" }}>
            Estado
            <select
              value={r.estado}
              onChange={(e) => cambiarEstado(r._id, e.target.value as EstadoReporte)}
            >
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="popup-fila">👤 {r.usuario ? r.usuario.nombre : "Anónimo"}</div>
          <button
            type="button"
            className="popup-eliminar"
            onClick={() => borrarReporte(r._id)}
          >
            Eliminar
          </button>
        </Popup>
      </Marker>
    );
  });

  return (
    <div className="app">
      <Sidebar vista={vista} onCambiar={setVista} />

      <div className="main">
        <Topbar total={reportes.length} />

        <div className="vista">
          {error && <div className="banner-error">⚠️ {error}</div>}

          {/* ============ INICIO ============ */}
          {vista === "inicio" && (
            <div className="vista-inicio">
              <div className="card hero">
                <h2>👋 Bienvenido a Alerta Ciudadana</h2>
                <p>
                  Reporta incidentes de inseguridad en Villavicencio y ayúdanos a
                  construir una comunidad más segura.
                </p>
                <div className="hero-acciones">
                  <button
                    className="btn btn-primario btn-auto"
                    onClick={() => setVista("nuevo")}
                  >
                    ➕ Crear reporte
                  </button>
                  <button
                    className="btn btn-ghost btn-auto"
                    onClick={() => setVista("mapa")}
                  >
                    🗺️ Ver el mapa
                  </button>
                </div>
              </div>

              {estadisticas && (
                <div className="tiles">
                  <div className="tile">
                    <div className="tile-num">{estadisticas.total}</div>
                    <div className="tile-lbl">Reportes</div>
                  </div>
                  {estadisticas.porGravedad.map((c) => (
                    <div className="tile" key={c._id}>
                      <div
                        className="tile-num"
                        style={{ color: COLOR_GRAVEDAD[c._id as Gravedad] }}
                      >
                        {c.total}
                      </div>
                      <div className="tile-lbl">{c._id}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ NUEVO REPORTE ============ */}
          {vista === "nuevo" && (
            <div className="card card-form">
              <div className="form-encabezado">
                <span className="form-ico">📝</span>
                <div>
                  <h2>Nuevo reporte</h2>
                  <p className="ayuda">
                    Cuéntanos lo que sucede. Tu reporte ayuda a construir una
                    comunidad más segura.
                  </p>
                </div>
              </div>

              <form onSubmit={manejarEnvio}>
                <div className="grid-2">
                  <label className="campo">
                    Tipo de incidente
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                      {TIPOS.map((t) => (
                        <option key={t} value={t}>
                          {ICONO_TIPO[t]} {ETIQUETA_TIPO[t]}
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
                          {EMOJI_GRAVEDAD[g]} {g}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid-2">
                  <label className="campo">
                    Reportado por
                    <select
                      value={reportadoPor}
                      onChange={(e) => setReportadoPor(e.target.value)}
                    >
                      <option value="">👤 Anónimo</option>
                      {usuarios.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="callout">
                    <span className="callout-ico">🔒</span>
                    <div>
                      <strong>Tu identidad está protegida.</strong>
                      <br />
                      Nunca compartiremos tus datos.
                    </div>
                  </div>
                </div>

                <label className="campo">
                  Descripción del incidente
                  <textarea
                    rows={4}
                    maxLength={500}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="¿Qué pasó? Describe los detalles del incidente…"
                  />
                  <span className="contador">{descripcion.length}/500</span>
                </label>

                <label className="campo">
                  Ubicación del incidente
                  <p className="ayuda" style={{ margin: "2px 0 0", fontWeight: 400 }}>
                    {punto
                      ? `Lugar elegido: ${punto.lat.toFixed(4)}, ${punto.lng.toFixed(4)}`
                      : "Usa tu ubicación actual, o haz clic en el mini-mapa para marcar el lugar."}
                  </p>
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-auto"
                  style={{ marginBottom: 10 }}
                  onClick={usarMiUbicacion}
                  disabled={ubicando}
                >
                  {ubicando ? "📍 Obteniendo ubicación…" : "📍 Usar mi ubicación actual"}
                </button>
                <div style={{ marginBottom: 16 }}>
                  <MapContainer
                    center={VILLAVICENCIO}
                    zoom={13}
                    className="mini-mapa-cont"
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <SelectorDeUbicacion onElegir={setPunto} />
                    <VolarA destino={centrarEn} />
                    {punto && (
                      <Marker position={[punto.lat, punto.lng]} icon={pinElegido()} />
                    )}
                  </MapContainer>
                </div>

                {mensaje && <p className="mensaje">{mensaje}</p>}

                <div className="form-acciones">
                  <button
                    type="button"
                    className="btn btn-ghost btn-auto"
                    onClick={cancelarForm}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primario btn-auto"
                    disabled={!punto || enviando}
                  >
                    {enviando ? "Enviando…" : "✈️ Enviar reporte"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============ MAPA ============ */}
          {vista === "mapa" && (
            <div className="vista-mapa">
              <div className="card barra-busqueda">
                <div className="bb-campo">
                  Radio (m)
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={radio}
                    onChange={(e) => setRadio(Number(e.target.value))}
                  />
                </div>
                <div className="bb-campo">
                  Tipo
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {ICONO_TIPO[t]} {ETIQUETA_TIPO[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-primario btn-auto"
                  onClick={buscarPorZona}
                  disabled={!punto}
                >
                  🔎 Buscar por zona
                </button>
                {circulo && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-auto"
                    onClick={verTodos}
                  >
                    Ver todos
                  </button>
                )}
                <span className="bb-ayuda">
                  {punto
                    ? "Centro: el punto elegido."
                    : "Haz clic en el mapa para fijar el centro."}
                </span>
              </div>

              <div className="mapa-grande">
                <MapContainer center={VILLAVICENCIO} zoom={13} className="mapa-cont">
                  <TileLayer
                    attribution="&copy; colaboradores de OpenStreetMap"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <SelectorDeUbicacion onElegir={setPunto} />
                  {circulo && (
                    <Circle
                      center={[circulo.lat, circulo.lng]}
                      radius={circulo.radio}
                      pathOptions={{ color: "#2563eb", fillOpacity: 0.06 }}
                    />
                  )}
                  {punto && (
                    <CircleMarker
                      center={[punto.lat, punto.lng]}
                      radius={8}
                      pathOptions={{
                        color: "#2563eb",
                        fillColor: "#2563eb",
                        fillOpacity: 0.5,
                      }}
                    />
                  )}
                  {marcadores}
                </MapContainer>
              </div>
            </div>
          )}

          {/* ============ ESTADÍSTICAS ============ */}
          {vista === "estadisticas" && (
            <div className="vista-stats">
              {estadisticas ? (
                <>
                  <div className="card stat-hero">
                    <div className="stat-total-num">{estadisticas.total}</div>
                    <div className="stat-total-lbl">reportes en total</div>
                  </div>
                  <div className="grid-stats">
                    <div className="card">
                      <h3 className="card-titulo">Por gravedad</h3>
                      {estadisticas.porGravedad.map((c) => (
                        <div className="stat-fila" key={c._id}>
                          <span
                            className="punto"
                            style={{ background: COLOR_GRAVEDAD[c._id as Gravedad] }}
                          />
                          {c._id}
                          <span className="num">{c.total}</span>
                        </div>
                      ))}
                    </div>
                    <div className="card">
                      <h3 className="card-titulo">Por tipo</h3>
                      {estadisticas.porTipo.map((c) => (
                        <div className="stat-fila" key={c._id}>
                          {ICONO_TIPO[c._id] ?? "•"} {ETIQUETA_TIPO[c._id] ?? c._id}
                          <span className="num">{c.total}</span>
                        </div>
                      ))}
                    </div>
                    <div className="card">
                      <h3 className="card-titulo">Por estado</h3>
                      {estadisticas.porEstado.map((c) => (
                        <div className="stat-fila" key={c._id}>
                          {c._id}
                          <span className="num">{c.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="card">Cargando estadísticas…</div>
              )}
            </div>
          )}

          {/* ============ CONSEJOS ============ */}
          {vista === "consejos" && (
            <div className="vista-info">
              <div className="card">
                <h2 className="card-titulo">🛡️ Consejos de seguridad</h2>
                <ul className="lista-consejos">
                  <li>Mantén tus objetos de valor fuera de la vista en lugares públicos.</li>
                  <li>Reporta cualquier actividad sospechosa apenas la notes.</li>
                  <li>Evita zonas poco iluminadas al caminar de noche.</li>
                  <li>Comparte tu ubicación con alguien de confianza si sales tarde.</li>
                  <li>Ante una emergencia, llama siempre a las autoridades.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ============ AYUDA ============ */}
          {vista === "ayuda" && (
            <div className="vista-info">
              <div className="card">
                <h2 className="card-titulo">❓ Ayuda</h2>
                <p className="ayuda">¿Cómo uso Alerta Ciudadana?</p>
                <ul className="lista-consejos">
                  <li>
                    <strong>Crear un reporte:</strong> ve a "Nuevo reporte", llena los
                    datos y haz clic en el mini-mapa para marcar el lugar.
                  </li>
                  <li>
                    <strong>Ver el mapa:</strong> en "Mapa" verás todos los reportes como
                    pines de colores según su gravedad.
                  </li>
                  <li>
                    <strong>Buscar por zona:</strong> en el mapa, haz clic para fijar un
                    centro, define un radio y pulsa "Buscar por zona".
                  </li>
                  <li>
                    <strong>Gestionar:</strong> abre un pin para cambiar su estado o
                    eliminarlo.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
