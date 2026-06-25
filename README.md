# terremotovenezuela2026

Mapa comunitario para el terremoto del 24 de junio de 2026 en Venezuela. Permite:

- **Solicitudes de búsqueda** — familiares piden que alguien verifique a una persona en una zona concreta.
- **Videos verificados** — situaciones reales marcadas en el mapa con enlace al video y a la fuente original.
- **Moderación** — todo lo que envía el público queda pendiente hasta que un administrador lo apruebe.

Construido con Next.js, Leaflet (OpenStreetMap) y Supabase. Despliegue gratuito en [Vercel](https://vercel.com).

## Requisitos

- Node.js 20+
- Cuenta gratuita en [Supabase](https://supabase.com)
- Cuenta gratuita en [Vercel](https://vercel.com)

## Configuración (una sola vez)

### 1. Supabase

1. Cree un proyecto en [supabase.com](https://supabase.com).
2. Abra **SQL Editor** y ejecute `supabase/schema.sql`.
3. En **Project Settings → API**, copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secreto) → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Variables de entorno

Copie `.env.example` a `.env.local` y rellene los valores. Genere una contraseña larga para `ADMIN_SECRET` (la usará en `/admin`).

### 3. Local

```bash
npm install
npm run dev
```

- Mapa: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## Despliegue en Vercel

1. Importe el repositorio en [vercel.com/new](https://vercel.com/new).
2. Añada las cuatro variables de entorno (las mismas que en `.env.local`).
3. Despliegue. La URL será algo como `https://terremotovenezuela2026.vercel.app`.

## Panel de administración

1. Vaya a `/admin` en su sitio desplegado.
2. Inicie sesión con el valor de `ADMIN_SECRET`.
3. Revise solicitudes y videos pendientes.
4. **Aprobar** — aparece en el mapa público.
5. **Rechazar** — se elimina de la cola.

## Accesibilidad

- Navegación por teclado y enlaces de salto
- Lista alternativa al mapa
- Contraste alto, etiquetas ARIA, textos en español

## Licencia

MIT — úselo para ayudar.
