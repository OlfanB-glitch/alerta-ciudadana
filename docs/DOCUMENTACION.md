# Documentación técnica — Alerta Ciudadana

Documentación completa del proyecto: arquitectura, modelo de datos, API, frontend,
funciones de MongoDB, despliegue e historial. Aplicación de la materia **Bases de
Datos No Relacionales**, ciudad de referencia: **Villavicencio (Meta)**.

- **Repositorio:** https://github.com/OlfanB-glitch/alerta-ciudadana
- **Carpeta local:** `~/code/alerta-ciudadana`

---

## 1. Descripción general

Alerta Ciudadana es una plataforma web full-stack para que los ciudadanos
**reporten incidentes de inseguridad** (robo, hurto de celular, vandalismo, riña,
actividad sospechosa) y los **visualicen sobre un mapa**. Cada reporte tiene tipo,
descripción, gravedad, estado y una **ubicación geográfica**. El sistema permite
crear, listar, filtrar, **buscar por zona (radio)**, cambiar el estado, eliminar,
gestionar usuarios y ver **estadísticas**.

El protagonista es **MongoDB**, del que se aprovechan: modelado de documentos,
índices (geoespacial y único), consultas geoespaciales, el pipeline de agregación
y las referencias entre colecciones.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Base de datos | MongoDB Atlas (nube) | — |
| ODM | Mongoose | ^9.7 |
| Backend | Node.js | 22 |
| | Express | ^5.2 |
| | TypeScript (ejecución con `tsx`) | ^6 |
| | dotenv, cors | ^17 / ^2.8 |
| Frontend | React + React DOM | ^19.2 |
| | Vite | ^8.1 |
| | react-leaflet / leaflet | ^5.0 / ^1.9 |
| | TypeScript | ~6 |
| Mapas | OpenStreetMap (vía Leaflet) | gratis, sin API key |
| Control de versiones | Git + GitHub | — |

> `tsconfig` del backend usa `module`/`moduleResolution`: **nodenext**.

---

## 3. Arquitectura

Arquitectura **cliente-servidor de tres capas**, comunicadas por una API REST que
intercambia JSON:

```
  Navegador (React + Leaflet)            Servidor (Express + Mongoose)        MongoDB Atlas
 ┌───────────────────────────┐   /api   ┌──────────────────────────────┐   ┌──────────────┐
 │  Interfaz / Mapa / Vistas │ ───────▶ │  Rutas → Controladores →     │ ─▶│  reportes    │
 │  (frontend, puerto 5173)  │ ◀─────── │  Modelos (validación)        │ ◀─│  usuarios    │
 └───────────────────────────┘  (proxy) └──────────────────────────────┘   └──────────────┘
                                  Vite                puerto 4000
```

- **Presentación (frontend):** React + Vite + TypeScript con mapa Leaflet.
- **Lógica (backend):** Express + Mongoose; rutas → controladores → modelos.
- **Datos:** MongoDB Atlas con índices `2dsphere` y `unique`.
- En desarrollo, el **proxy de Vite** reenvía `/api` → `localhost:4000` (evita CORS).
- Las credenciales viven en `.env` (no en el código ni en el repositorio).

---

## 4. Estructura del proyecto

```
alerta-ciudadana/
├── backend/
│   ├── src/
│   │   ├── config/db.ts                 # Conexión a MongoDB Atlas
│   │   ├── models/
│   │   │   ├── Reporte.ts               # Esquema de reportes (GeoJSON + 2dsphere)
│   │   │   └── Usuario.ts               # Esquema de usuarios (email único)
│   │   ├── controllers/
│   │   │   ├── reportes.controller.ts   # Lógica de los endpoints de reportes
│   │   │   └── usuarios.controller.ts   # Lógica de los endpoints de usuarios
│   │   ├── routes/
│   │   │   ├── reportes.routes.ts
│   │   │   └── usuarios.routes.ts
│   │   ├── seed.ts                       # Datos de ejemplo
│   │   └── index.ts                      # Arranque del servidor + middlewares
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api.ts                        # Cliente tipado del backend (fetch)
│   │   ├── App.tsx                       # Vistas, mapa, formulario, estadísticas
│   │   ├── App.css / index.css           # Estilos (diseño "clay" azul)
│   │   └── main.tsx
│   ├── index.html                        # Fuentes (Sora + Public Sans)
│   ├── vite.config.ts                    # Proxy /api → 4000
│   └── package.json
├── docs/DOCUMENTACION.md                 # Este documento
└── README.md
```

---

## 5. Requisitos previos

- Node.js 18+ y npm.
- Cuenta de MongoDB Atlas con un cluster creado.
- En Atlas: un usuario de base de datos (rol read/write) y la IP autorizada en
  **Network Access** (para la demo, `0.0.0.0/0`).

---

## 6. Configuración y ejecución

### Backend
```bash
cd backend
cp .env.example .env       # crear el archivo de variables
# editar .env y poner MONGODB_URI con la cadena de Atlas (base: alerta_ciudadana)
npm install
npm run dev                # http://localhost:4000
```

`backend/.env`:
```
MONGODB_URI="mongodb+srv://USUARIO:CONTRASENA@cluster.xxxx.mongodb.net/alerta_ciudadana?retryWrites=true&w=majority"
PORT=4000
```

Scripts del backend: `dev` (tsx watch), `build` (tsc), `start` (node dist), `seed`.

### Datos de ejemplo (opcional)
```bash
npm run seed               # ⚠️ vacía 'reportes' y 'usuarios' y carga 2 usuarios + 5 reportes
```

### Frontend
```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

---

## 7. Modelo de datos

Dos colecciones. Los reportes guardan la ubicación como **GeoJSON Point** y una
**referencia** al usuario autor.

### 7.1 Colección `reportes`
| Campo | Tipo | Reglas |
|-------|------|--------|
| `tipo` | String (enum) | requerido — robo, hurto_celular, vandalismo, riña, actividad_sospechosa |
| `descripcion` | String | requerido, mínimo 5 caracteres, `trim` |
| `gravedad` | String (enum) | baja, media, **alta** — por defecto `media` |
| `estado` | String (enum) | nuevo, en_revision, resuelto, descartado — por defecto `nuevo` |
| `ubicacion` | GeoJSON Point | requerido; `coordinates: [longitud, latitud]`; valida rangos |
| `direccionTexto` | String | opcional |
| `fechaIncidente` | Date | por defecto `Date.now` |
| `reportadoPor` | ObjectId (ref `Usuario`) | opcional |
| `createdAt` / `updatedAt` | Date | automáticos (`timestamps`) |

Índice: `reporteSchema.index({ ubicacion: "2dsphere" })`.

Documento de ejemplo:
```json
{
  "tipo": "robo",
  "descripcion": "Robo de celular cerca del parque principal",
  "gravedad": "alta",
  "estado": "nuevo",
  "ubicacion": { "type": "Point", "coordinates": [-73.6266, 4.142] },
  "fechaIncidente": "2026-06-22T21:30:00.000Z",
  "reportadoPor": "665f...",
  "createdAt": "...", "updatedAt": "..."
}
```

### 7.2 Colección `usuarios`
| Campo | Tipo | Reglas |
|-------|------|--------|
| `nombre` | String | requerido, `trim` |
| `email` | String | requerido, **único** (índice unique), `lowercase`, `trim` |
| `rol` | String (enum) | ciudadano, autoridad, admin — por defecto `ciudadano` |
| `createdAt` / `updatedAt` | Date | automáticos |

### 7.3 Decisión de modelado
Se usa **referencia** (no copia) del usuario en el reporte (`reportadoPor`), porque
el usuario es una entidad compartida por muchos reportes. La unión se resuelve con
`$lookup` cuando se necesita mostrar el autor.

---

## 8. Backend

### 8.1 Conexión (`config/db.ts`)
`conectarBaseDeDatos()` lee `MONGODB_URI` del `.env`; si falta o falla la conexión,
detiene el proceso con un mensaje claro. El servidor solo arranca tras conectar.

### 8.2 Modelos
Esquemas Mongoose con enums (listas cerradas reutilizables), validación a nivel de
esquema, sub-esquema GeoJSON con validación de rangos de coordenadas, índice
`2dsphere` y `timestamps`.

### 8.3 Manejo de errores (códigos HTTP)
| Código | Cuándo |
|--------|--------|
| 200 | Operación correcta |
| 201 | Recurso creado |
| 400 | Datos inválidos (validación), id con formato incorrecto, email duplicado |
| 404 | Recurso no encontrado |
| 500 | Error interno |

Los errores de validación de Mongoose se capturan y se devuelven en español con la
lista de `detalles`. El email duplicado se detecta por el error `11000`.

---

## 9. API REST (referencia)

Base: `http://localhost:4000`

### Salud
`GET /api/salud` → estado del servidor y de la conexión a la BD.

### Reportes

**Crear** — `POST /api/reportes`
```json
// body
{ "tipo": "robo", "descripcion": "Robo en el centro", "gravedad": "alta",
  "longitud": -73.6266, "latitud": 4.142, "reportadoPor": "<id opcional>" }
// 201 → el reporte creado
```
Recibe `longitud`/`latitud` por separado y arma el GeoJSON internamente. Valida que
`reportadoPor` (si viene) sea un id válido y exista.

**Listar** — `GET /api/reportes?tipo=&gravedad=&estado=`
```json
{ "total": 5, "reportes": [ /* ... */ ] }
```

**Buscar por zona** — `GET /api/reportes/cerca?lng=&lat=&radio=&tipo=&desde=&hasta=`
Usa `$geoNear`; devuelve cada reporte con `distanciaMetros` y `usuario`, ordenados
del más cercano al más lejano.
```json
{ "centro": {"longitud":-73.626,"latitud":4.142}, "radioMetros":2000,
  "total": 3, "reportes": [ { "...": "...", "distanciaMetros": 412.7, "usuario": {…} } ] }
```

**Estadísticas** — `GET /api/reportes/estadisticas` (pipeline `$facet`)
```json
{ "total": 5,
  "porTipo": [{"_id":"robo","total":2}, …],
  "porGravedad": [{"_id":"alta","total":3}, …],
  "porEstado": [{"_id":"nuevo","total":4}, …] }
```

**Con autor** — `GET /api/reportes/con-usuario` (une con `$lookup` + `$unwind`)
Cada reporte trae un campo `usuario` con `{ _id, nombre, email, rol… }` (o ausente
si no tiene autor).

**Cambiar estado** — `PATCH /api/reportes/:id`
```json
{ "estado": "resuelto" }   // 200 → reporte actualizado; 400 id/enum; 404 no existe
```

**Eliminar** — `DELETE /api/reportes/:id` → `{ "mensaje": "Reporte eliminado", "id": "…" }`

### Usuarios
- `POST /api/usuarios` — body `{ nombre, email, rol? }` → 201. Email duplicado → 400.
- `GET /api/usuarios` → `{ total, usuarios }`.

### Resumen de rutas
| Método | Ruta |
|--------|------|
| GET | `/api/salud` |
| POST | `/api/reportes` |
| GET | `/api/reportes` |
| GET | `/api/reportes/cerca` |
| GET | `/api/reportes/estadisticas` |
| GET | `/api/reportes/con-usuario` |
| PATCH | `/api/reportes/:id` |
| DELETE | `/api/reportes/:id` |
| POST | `/api/usuarios` |
| GET | `/api/usuarios` |

---

## 10. Funciones de MongoDB demostradas

| Función | Dónde | Para qué |
|---------|-------|----------|
| Modelo de documentos + enums + validación | modelos Mongoose | Reportes y usuarios |
| Índice `2dsphere` | `Reporte` | Habilita las consultas geográficas |
| Índice `unique` | `Usuario.email` | Evita emails repetidos (error 11000) |
| `$geoNear` | `/cerca` | Búsqueda por radio + distancia calculada |
| `$facet` | `/estadisticas` | Varias agregaciones en una sola consulta |
| `$group`, `$sort`, `$count` | `/estadisticas` | Conteos por tipo/gravedad/estado |
| `$lookup` + `$unwind` | `/con-usuario`, `/cerca` | "Unir" reportes con su autor |
| Referencias (`ref`) | `reportadoPor` | Relación entre colecciones |

Ejemplo (`$geoNear` en `/cerca`):
```js
Reporte.aggregate([
  { $geoNear: { near: { type: "Point", coordinates: [lng, lat] },
                distanceField: "distanciaMetros", maxDistance: radio,
                spherical: true, query } },
  { $lookup: { from: "usuarios", localField: "reportadoPor",
               foreignField: "_id", as: "usuario" } },
  { $unwind: { path: "$usuario", preserveNullAndEmptyArrays: true } },
  { $limit: 100 },
]);
```

---

## 11. Frontend

### 11.1 Estructura
Aplicación de una sola página con **navegación por vistas** (estado `vista`):
**Inicio, Nuevo reporte, Mapa, Estadísticas, Consejos, Ayuda**. Todo el estado y
los manejadores viven en `App.tsx`; `api.ts` es el cliente del backend.

### 11.2 Componentes clave
- `Sidebar` — barra lateral de iconos para cambiar de vista.
- `Topbar` — título, chips del semáforo, campana y avatar.
- `SelectorDeUbicacion` — escucha los clics en el mapa (`useMapEvents`).
- `VolarA` — centra/vuela el mapa hacia un punto (`useMap`), usado por la ubicación GPS.
- `pinReporte()` — genera un pin Leaflet (`divIcon`) con **icono por tipo** y **borde por gravedad**.

### 11.3 Cliente de API (`api.ts`)
Funciones tipadas con `fetch`: `listarReportesConUsuario`, `buscarReportesCerca`,
`crearReporte`, `actualizarEstado`, `eliminarReporte`, `obtenerEstadisticas`,
`listarUsuarios`. Un helper `manejarRespuesta` traduce los errores del backend a
mensajes en español.

### 11.4 Funcionalidades
- **Mapa** de Villavicencio con los reportes como pines (icono por tipo, color por
  gravedad: 🟢 baja / 🟡 media / 🔴 alta) y **popups tipo tarjeta**.
- **Crear reporte** desde un formulario en tarjeta (dos columnas, contador 0/500),
  eligiendo el lugar en un **mini-mapa**.
- **Ubicación actual (GPS):** botón que usa `navigator.geolocation`, marca el punto
  y vuela el mapa; maneja permiso denegado, no disponible y tiempo de espera.
- **Buscar por zona:** centro por clic + radio + tipo; dibuja el **círculo** y
  muestra la **distancia** en los popups; botón "Ver todos".
- **Gestión:** cambiar estado y eliminar desde el popup.
- **Estadísticas:** total y desgloses, que se actualizan al crear/cambiar.

### 11.5 Diseño (UI)
Estilo "clay" azul (inspirado en SOSAFE): barra lateral + barra superior, tarjetas
con profundidad, tipografía **Sora** (títulos) + **Public Sans** (cuerpo) cargadas
desde Google Fonts en `index.html`, responsive. Paleta y variables en `index.css`.

### 11.6 Proxy
`vite.config.ts` reenvía `/api` → `http://localhost:4000`, de modo que el frontend
llama a rutas relativas (`/api/...`) sin problemas de CORS.

---

## 12. Seguridad y secretos
- La cadena de conexión y la contraseña viven **solo** en `backend/.env`.
- `.gitignore` excluye `.env` y todas sus variantes (`.env.*`); en el repositorio
  solo está `.env.example`.
- Recomendación: si la contraseña de Atlas se filtra, rotarla (Database Access →
  Edit password).

---

## 13. Control de versiones y despliegue
- Repositorio público en GitHub: `OlfanB-glitch/alerta-ciudadana`, rama `main`.
- Para subir cambios: `git push`.

### Historial de commits
| Commit | Descripción |
|--------|-------------|
| 2f32d6b | Configuración inicial: backend con Express + Mongoose y conexión a Atlas |
| dc98201 | Backend de reportes: modelo Mongoose y endpoints crear/listar |
| e180b7c | Búsqueda geoespacial por radio (`/api/reportes/cerca`) |
| 078bb8a | Estadísticas con el pipeline de agregación (`$facet`) |
| 511c060 | Gestión de estado de reportes: cambiar estado y eliminar |
| 2cacc0f | Colección usuarios, referencia `reportadoPor` y unión con `$lookup` |
| f90fe1d | Documentación (README) y script de datos de ejemplo (seed) |
| 01f5fbc | Búsqueda por zona con `$geoNear` (radio, distancia y autor) |
| 82c5ab5 | Rediseño UI estilo clay (azul) multi-vista + ubicación actual por GPS |

---

## 14. Limitaciones y trabajo futuro
- **Sin autenticación real** (login/contraseña): los usuarios se gestionan, pero no
  hay inicio de sesión. La asociación autor-reporte es manual.
- **Zona por radio** (no por polígonos de barrios).
- **Sin notificaciones en tiempo real.**
- Posibles mejoras: login con JWT y hash de contraseña, filtros avanzados en el mapa,
  exportación de estadísticas, despliegue del backend y el frontend en la nube.

---

## 15. Glosario rápido
- **GeoJSON Point:** `{ type: "Point", coordinates: [longitud, latitud] }`. Ojo: el
  orden es [lng, lat]; **Leaflet** usa el orden inverso [lat, lng].
- **Índice 2dsphere:** índice que habilita las consultas geográficas sobre la Tierra.
- **Pipeline de agregación:** secuencia de etapas que transforman/resumen documentos.
- **$lookup:** etapa que "une" documentos de otra colección (similar a un JOIN).
- **Referencia (`ref`):** un campo que guarda el `_id` de un documento de otra colección.
