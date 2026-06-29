# ParqueoSys — Sistema de Parqueo

Sistema de gestión de parqueo con dos roles: **Admin** (reportes) y **Worker** (registro y cobros). Construido con Next.js 16 y Supabase.

> **Zona horaria:** Todas las fechas y horas usan `America/La_Paz` (Bolivia, UTC-4).

## Roles

| Rol | Permisos |
|-----|----------|
| **Admin** | Reportes por día, semana y mes. **Crear y gestionar usuarios** (operadores y admins). |
| **Worker** | Registrar entrada de vehículos, ver activos en tiempo real, procesar salida y cobro. |

## Lógica de cobro

- **1ra hora:** tarifa fija (por defecto Bs. 7)
- **Horas extra:** Bs. por cada hora adicional (por defecto Bs. 1)
- **15 minutos de gracia** (configurable por tipo de vehículo)
- Horas parciales se redondean hacia arriba
- El admin puede cambiar 1ra hora, hora extra y gracia en **Admin → Tarifas**

## Configuración

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. En **SQL Editor**, ejecuta el contenido de `supabase/schema.sql`
3. En **Settings > API**, copia la URL y la anon key

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...       # o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=...           # necesaria para crear usuarios
```

La **service role key** está en Supabase → Settings → API → `service_role` (secreta, no la expongas en el frontend).

### 3. Crear usuarios iniciales

Ejecuta el script que crea un admin y un operador automáticamente:

```bash
npm run setup:users
```

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@parqueo.com | Admin1234! |
| Operador | worker@parqueo.com | Worker1234! |

> Cambia las contraseñas en producción. El admin también puede crear más usuarios desde **Admin → Usuarios**.

### 4. Ejecutar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Despliegue en Vercel

### 1. Subir el repositorio

El proyecto Next.js está en la carpeta `parqueo-app`. Si el repositorio incluye la raíz `Parqueo`, en Vercel configura:

- **Root Directory:** `parqueo-app`
- **Framework Preset:** Next.js (detección automática)

### 2. Variables de entorno en Vercel

En **Project → Settings → Environment Variables**, añade (para Production, Preview y Development):

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon / publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role` (solo servidor) |

> Marca `SUPABASE_SERVICE_ROLE_KEY` como sensible. No la uses con el prefijo `NEXT_PUBLIC_`.

### 3. Configurar Supabase Auth

En **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://tu-app.vercel.app`
- **Redirect URLs:** añade `https://tu-app.vercel.app/**`

Si usas dominio propio, inclúyelo también.

### 4. Desplegar

```bash
npx vercel
```

O conecta el repositorio en [vercel.com](https://vercel.com) para despliegues automáticos en cada push.

### 5. Usuarios iniciales en producción

Ejecuta el script **una vez** en local con las variables de producción, o crea usuarios desde Supabase Dashboard:

```bash
npm run setup:users
```

Cambia las contraseñas por defecto después del primer acceso.

## Estructura

```
src/
├── app/
│   ├── admin/          # Panel de reportes (solo admin)
│   ├── worker/         # Panel de operador (solo worker)
│   └── login/          # Inicio de sesión
├── components/
│   ├── admin/          # Dashboard con gráficas
│   └── worker/         # Registro y cobros
├── lib/
│   ├── pricing.ts      # Cálculo de tarifas
│   └── supabase/       # Clientes Supabase
└── types/
    └── database.ts     # Tipos TypeScript
supabase/
├── schema.sql          # Esquema completo con RLS
└── seed.sql            # Datos de prueba
```

## Flujo de operación (Worker)

1. El operador registra la **placa** y **tipo de vehículo** al entrar
2. El vehículo aparece en la lista de activos con tiempo transcurrido y cobro estimado
3. Al salir, el operador presiona **Cobrar salida**, elige método de pago y confirma
4. El sistema calcula el monto automáticamente y marca la entrada como completada

## Reportes (Admin)

- Filtros: **Hoy**, **Esta semana**, **Este mes**
- Métricas: vehículos atendidos, ingresos totales, ticket promedio, estancia promedio
- Gráfica de ingresos por hora (día) o por día (semana/mes)
- Desglose por método de pago y tipo de vehículo
- Tabla de últimas transacciones

## Seguridad

- Row Level Security (RLS) en todas las tablas
- Workers solo ven entradas activas y las que ellos registraron
- Admins tienen acceso completo de lectura
- Middleware de Next.js redirige según rol autenticado
