# Carta Viva · by SOCIAL

Plataforma multi-marca para restaurantes y hoteles: carta QR, **Tarjeta de la casa** (sellos digitales) y panel para el dueño.

## Rutas
| Ruta | Para quién |
|---|---|
| `/:marca` | Comensal: carta (ej. `/la-unica`) |
| `/:marca/tarjeta` | Registro y recuperación de la tarjeta |
| `/:marca/t/:token` | La tarjeta del cliente |
| `/:marca/mesero` | Mesero: nombre + PIN, sellar y canjear |
| `/panel` | Dueño y SOCIAL: resumen, dormidos, miembros, meseros, carta, configuración, marcas |

## Reglas de la tarjeta
Todas corren en la base de datos (`supabase/migrations`), no en el navegador: consumo mínimo, un sello por día (hora de Colombia), doble sello por día de la semana o invitado nuevo (máx. 2), +1 en el mes de cumpleaños, tope de 10, regalos que vencen, reinicio a 12 meses sin visita y al canjear el último regalo. El QR del cliente cambia cada 60 s.

## Nueva marca
Panel → Marcas → Nueva marca → Configuración (colores, logo, regalos) → Carta → Importar carta (JSON) → Meseros. Listo: su link es `/slug`.

## Instalar
1. Supabase → SQL Editor → pegar `supabase/instalar.sql` → Run.
2. Variables en el hosting: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ver `.env.example`).
3. Build: `npm run build` · carpeta `dist`.
4. La primera cuenta que entre a `/panel` queda como administradora de SOCIAL.

Mesero de prueba de La Única: **Prueba / 1234** (desactívalo desde el panel cuando arranquen).

