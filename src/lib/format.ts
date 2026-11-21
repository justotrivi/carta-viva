export const cop = (n?: number | null) =>
  n == null ? "" : "$" + Math.round(n).toLocaleString("es-CO").replace(/,/g, ".");

const TZ = "America/Bogota";
export const fecha = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }) : "";
export const fechaCorta = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: TZ }) : "";
export const hora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: TZ }) : "";

export const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
export const DIAS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

export const REASON: Record<string, string> = {
  normal: "Sello",
  dia_doble: "Doble sello del día",
  invitado_nuevo: "Doble sello por invitado nuevo",
  cumpleanos: "Sello de cumpleaños",
};

export const waLink = (phone: string, text: string) =>
  `https://wa.me/57${phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(text)}`;

export const diasDoble = (d: number[]) => {
  const s = [...d].sort();
  if (s.join() === "1,2,3") return "lunes a miércoles";
  return s.map((x) => DIAS[x]).join(", ");
};

import type { Config } from "./api";
export const U = (c: Config) => {
  const s = c.unit_singular || "visita", p = c.unit_plural || "visitas";
  return {
    s, p,
    n: (n: number) => `${n} ${n === 1 ? s : p}`,
    falta: (n: number) => (n === 1 ? `Te falta 1 ${s}` : `Te faltan ${n} ${p}`),
    cap: (w: string) => w[0].toUpperCase() + w.slice(1),
  };
};
export const extras = (c: Config) => {
  const out: { n: string; t: string; d: string }[] = [];
  const u = U(c);
  if (c.referral_bonus !== false) out.push({ n: "×2", t: "Trae a alguien nuevo", d: `Si se registra ese mismo día, tu ${u.s} vale doble.` });
  if (c.double_days?.length) out.push({ n: "×2", t: `De ${diasDoble(c.double_days)}`, d: `Tu ${u.s} vale doble.` });
  if (c.birthday_bonus !== false) out.push({ n: "+1", t: "Tu mes de cumpleaños", d: `${c.birthday_gift} y un sello extra.` });
  return out;
};
export const reglas = (c: Config) => {
  const u = U(c);
  const min = c.min_amount > 0 ? ` con consumo desde ${cop(c.min_amount)}` : "";
  return `Un sello por día por cada ${u.s}${min}. Los regalos vencen ${c.reward_days} días después de ganarlos.`;
};

export const W = (c: Config) => {
  const t = c.mode === "tienda";
  return {
    tienda: t,
    item: t ? "producto" : "plato",
    staff: t ? "en caja" : "al mesero",
    tab: t ? "Mi pedido" : "Mi mesa",
    title: t ? "Tu pedido" : "Tu mesa",
    toOrder: t ? "a tu pedido" : "a tu mesa",
    addBtn: t ? "Agregar al pedido" : "Agregar a la mesa",
    hint: c.search_hint || (t ? "Buscar…" : "Buscar: taco, lomo, mezcal…"),
  };
};
