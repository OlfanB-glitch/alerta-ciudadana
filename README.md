# Alerta Ciudadana

Plataforma para que los ciudadanos **reporten incidentes de inseguridad**
(robo, hurto de celular, vandalismo, riña, actividad sospechosa) y los
visualicen en un **mapa** de la ciudad de **Villavicencio (Meta, Colombia)**.

Proyecto de la materia **Bases de Datos No Relacionales**. El protagonista es
**MongoDB**: el proyecto está pensado para demostrar modelado de documentos,
índices, consultas geoespaciales, el pipeline de agregación y referencias entre
colecciones.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Base de datos | MongoDB (Atlas, en la nube) |
| Backend | Node.js + Express + Mongoose + TypeScript |
| Frontend | React + Vite + TypeScript + Leaflet (mapas de OpenStreetMap) |

---

## Modelo de datos

Dos colecciones:

### `reportes`
```jsonc
{
  "tipo": "robo",                 // robo | hurto_celular | vandalismo | riña | actividad_sospechosa
  "descripcion": "…",
  "gravedad": "alta",             // baja | media | alta
  "estado": "nuevo",              // nuevo | en_revision | resuelto | descartado
  "ubicacion": {                  // GeoJSON Point con índice 2dsphere
    "type": "Point",
    "coordinates": [-73.6266, 4.142]   // [longitud, latitud]
  },
  "direccionTexto": "…",
  "fechaIncidente": "2026-06-22T21:30:00Z",
  "reportadoPor": "ObjectId(usuarios)", // referencia a usuarios (opcional)
  "createdAt": "…",
  "updatedAt": "…"
}
```

### `usuarios`
```jsonc
{
  "nombre": "…",
  "email": "…",        // índice ÚNICO (no se repite)
  "rol": "ciudadano",  // ciudadano | autoridad | admin
  "createdAt": "…",
  "updatedAt": "…"
}
```

---

## Funciones de MongoDB demostradas

- **Modelado de documentos** con enums y validación a nivel de esquema (Mongoose).
- **Índices**: `2dsphere` sobre `ubicacion` (geográfico) y `unique` sobre `email`.
- **Consultas geoespaciales**: búsqueda por radio con `$near` + `$maxDistance`.
- **Pipeline de agregación**: `$group`, `$sort`, `$count`, `$facet` (varias
  agregaciones en una consulta) y `$lookup` + `$unwind` (unir colecciones).
- **Referencias entre colecciones** (`reportadoPor` → `usuarios`).

---

## Requisitos previos

- Node.js 18+ y npm
- Una cuenta de **MongoDB Atlas** con un cluster creado

---

## Configuración

### 1. Backend
```bash
cd backend
cp .env.example .env      # crea tu archivo de variables
```
Edita `backend/.env` y pon tu cadena de conexión de Atlas en `MONGODB_URI`
(con la base `alerta_ciudadana`). El archivo `.env` **no se sube a git**.

```bash
npm install               # instala dependencias
npm run dev               # arranca el backend en http://localhost:4000
```

(Opcional) Llenar la BD con datos de ejemplo de Villavicencio:
```bash
npm run seed              # ⚠️ vacía reportes y usuarios antes de insertar
```

### 2. Frontend
En otra terminal:
```bash
cd frontend
npm install
npm run dev               # arranca el frontend (normalmente http://localhost:5173)
```
El frontend usa un *proxy* de Vite: las llamadas a `/api/...` se reenvían al
backend en el puerto 4000.

---

## API

Base: `http://localhost:4000`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/salud` | Estado del servidor y de la conexión a la BD |
| `POST` | `/api/reportes` | Crear un reporte (recibe `longitud`/`latitud`) |
| `GET` | `/api/reportes` | Listar reportes. Filtros: `?tipo=&gravedad=&estado=` |
| `GET` | `/api/reportes/cerca` | Buscar por radio: `?lng=&lat=&radio=` (+ `tipo`, `desde`, `hasta`) |
| `GET` | `/api/reportes/estadisticas` | Conteos por tipo, gravedad y estado (`$facet`) |
| `GET` | `/api/reportes/con-usuario` | Reportes con su autor unido (`$lookup`) |
| `PATCH` | `/api/reportes/:id` | Cambiar el `estado` de un reporte |
| `DELETE` | `/api/reportes/:id` | Eliminar un reporte |
| `POST` | `/api/usuarios` | Crear un usuario |
| `GET` | `/api/usuarios` | Listar usuarios |

---

## Estructura del proyecto

```
alerta-ciudadana/
├── backend/                 # API (Express + Mongoose + TypeScript)
│   ├── src/
│   │   ├── config/db.ts     # conexión a MongoDB Atlas
│   │   ├── models/          # esquemas Reporte y Usuario
│   │   ├── controllers/     # lógica de cada endpoint
│   │   ├── routes/          # mapeo de rutas
│   │   ├── seed.ts          # datos de ejemplo
│   │   └── index.ts         # arranque del servidor
│   └── .env.example
├── frontend/                # App (React + Vite + Leaflet)
│   └── src/
│       ├── api.ts           # cliente del backend
│       └── App.tsx          # mapa, formulario y estadísticas
└── README.md
```
