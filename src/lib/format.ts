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
