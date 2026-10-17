# ParqueoSys — Sistema de Parqueo

Sistema de gestión de parqueo con dos roles: **Admin** y **Operador**. Construido con Next.js 16, React 19 y Supabase.

> **Zona horaria:** fechas, semanas (lunes a domingo) y cobros usan `America/La_Paz` (Bolivia, UTC-4, sin horario de verano).

## Roles

| Rol | Qué puede hacer |
|-----|-----------------|
| **Admin** | Reportes por día, semana, mes o rango de fechas. Tarifas. Usuarios (crear, bloquear, desbloquear, restablecer contraseña). Depósitos de los operadores. |
| **Operador** | Entrada y salida de vehículos, etiqueta de ingreso, parqueo mensual y confirmación del depósito de la semana. |

El ingreso siempre pasa por `/login`. Tras varios intentos fallidos la cuenta se bloquea y solo un admin puede desbloquearla.

## Cobro

**Por horas** (automóvil y motocicleta):

- La primera hora se cobra completa (por defecto Bs. 7).
- Después de esa hora hay minutos de gracia (por defecto 15).
- Cada hora extra se cobra aparte (por defecto Bs. 1) y la fracción se redondea hacia arriba.

**Moto todo el día:** tarifa fija (por defecto Bs. 10).

**Mensual:** el admin define la tarifa mensual por tipo. El operador registra la placa y el periodo. Si esa placa tiene un plan vigente, la salida por horas queda en Bs. 0.

El admin cambia tarifas en **Admin → Tarifas**.

El cobro de salida lo calcula el servidor y queda registrado como **efectivo**.

## Operación diaria

1. El operador anota la placa (4 números y 3 letras, por ejemplo `4578DFC`) y el tipo de vehículo.
2. Si el PC tiene el agente de impresión abierto, sale la etiqueta de ingreso.
3. El vehículo queda en la lista de activos, con tiempo y cobro estimado.
4. Al salir, **Cobrar salida** cierra la entrada. Si la placa es mensual vigente, el monto es 0.
5. En **Mensual** se venden o cancelan planes.
6. En **Depósito** el operador ve lo cobrado en la semana (por horas + mensuales) y confirma el monto entregado. Si el monto no coincide, tiene que dejar una nota.

## Reportes (Admin)

- **Hoy**, **Esta semana**, **Este mes** o un rango **Desde / Hasta**.
- El rango se consulta en la base: no depende de las últimas salidas cargadas en pantalla.
- Métricas: vehículos atendidos e ingresos del periodo.
- Gráfica por hora (un día) o por día (varios días).
- Desglose por tipo de vehículo y las últimas transacciones del periodo.
- Si un rango supera 20.000 salidas, se muestran las más recientes y aparece un aviso.

**Admin → Depósitos** resume lo confirmado por operador y por semana en el mismo tipo de rango.

## Configuración

### 1. Base de datos

En el SQL Editor de Supabase, sobre un proyecto nuevo, ejecuta en este orden:

1. `supabase/schema.sql`
2. `supabase/migrate-motorcycle-day.sql`
3. `supabase/migrate-pricing-first-hour.sql`
4. `supabase/migrate-monthly-parking.sql`
5. `supabase/migrate-monthly-pricing.sql`
6. `supabase/migrate-worker-deposits.sql`
7. `supabase/migrate-login-security.sql`
8. `supabase/migrate-security-hardening.sql`

`schema.sql` solo no alcanza: mensuales, depósitos y el bloqueo de login viven en esas migraciones. Los archivos `fix-*.sql` son correcciones puntuales; úsalos solo si el proyecto ya existía y Supabase lo indica.

En **Authentication → Providers → Email**, desactiva el registro público. Los usuarios los crea el admin.

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor: usuarios, bloqueo, depósitos |
| `NEXT_PUBLIC_SITE_URL` | URL pública, obligatoria en producción (enlaces de recuperación) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Correo de recuperación de contraseña |

No pongas la service role ni la clave SMTP en variables `NEXT_PUBLIC_`. No subas `.env.local`.

### 3. Usuarios iniciales

En `.env.local`, define correo y contraseña (el repositorio no trae ninguna):

```
SETUP_ADMIN_EMAIL=...
SETUP_ADMIN_PASSWORD=...
SETUP_WORKER_EMAIL=...
SETUP_WORKER_PASSWORD=...
```

```bash
npm run setup:users
```

### 4. Arranque

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

En el PC de la impresora de etiquetas, deja abierto `print-agent/ParqueoSys-Impresion.bat` (o `npm run print:server`). El agente escucha solo en `127.0.0.1:3847`. La guía corta está en `print-agent/LEEME.txt`.

## Despliegue en Vercel

- **Root Directory:** `parqueo-app` si el repo incluye la carpeta padre.
- **Región:** `gru1` (`vercel.json`).
- Variables: las de la tabla de arriba, en Production, Preview y Development. Marca `SUPABASE_SERVICE_ROLE_KEY` y `SMTP_PASS` como sensibles.
- En Supabase → Authentication → URL Configuration: **Site URL** = `NEXT_PUBLIC_SITE_URL` y **Redirect URLs** = `https://tu-app.vercel.app/**`.

La impresión no se configura en Vercel. El navegador del PC de caja llama al agente local.

## Estructura

```
src/app/admin/     Reportes, tarifas, usuarios, depósitos
src/app/worker/    Entrada/salida, mensual, depósito
src/app/api/       Login, usuarios, cobro, depósitos, reportes
src/lib/           Tarifas, fechas Bolivia, depósitos, impresión
supabase/          Esquema y migraciones
print-agent/       Instalador de la impresora en Windows
```

## Seguridad

- RLS activo en perfiles, tarifas, entradas, mensuales y depósitos.
- Un operador ve las entradas activas y las que él registró o cobró. El admin ve todas.
- El monto de una salida lo fija la base al pasar a cobrada (trigger de `migrate-security-hardening.sql`), no el navegador.
- El depósito semanal lo inserta el servidor, con el total recalculado. El operador no puede confirmar dos veces la misma semana.
- Middleware separa `/admin` y `/worker` según el rol y cierra la sesión si la cuenta está bloqueada.
