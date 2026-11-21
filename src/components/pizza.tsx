import type React from "react";
// Pizza rectangular dibujada: base y toppings según los ingredientes (para cartas sin foto y para "Arma tu pizza")
type T = { kind: string; color: string; color2?: string };

const RULES: [RegExp, T][] = [
  [/pepperoni/i, { kind: "disc", color: "#B3261E", color2: "#8E1B15" }],
  [/salami/i, { kind: "disc", color: "#9C2F3A", color2: "#E8B4B8" }],
  [/chorizo/i, { kind: "disc", color: "#A33A1A" }],
  [/serrano/i, { kind: "ribbon", color: "#C8484E" }],
  [/jam[oó]n/i, { kind: "square", color: "#E89AA0" }],
  [/tocineta/i, { kind: "strip", color: "#8B3A1E", color2: "#E8B48A" }],
  [/pollo/i, { kind: "chunk", color: "#E9D3A8" }],
  [/champi/i, { kind: "mush", color: "#CDB79A" }],
  [/camar/i, { kind: "shrimp", color: "#F08A4B" }],
  [/marisco/i, { kind: "shrimp", color: "#E8774A" }],
  [/pi[ñn]a/i, { kind: "chunk", color: "#F2C94C" }],
  [/ma[ií]z/i, { kind: "dot", color: "#F4D35E" }],
  [/cebolla/i, { kind: "ring", color: "#9B5DA6" }],
  [/manzana/i, { kind: "chunk", color: "#8BC34A" }],
  [/burrata/i, { kind: "blob", color: "#FBF7EE" }],
  [/queso crema/i, { kind: "blob", color: "#FFFDF6" }],
  [/costeño|español|parmesano/i, { kind: "chunk", color: "#FFF1C1" }],
  [/cherry/i, { kind: "disc", color: "#E53935" }],
  [/bolo[ñn]esa/i, { kind: "crumb", color: "#7A3B22" }],
  [/vegetales/i, { kind: "mix", color: "#43A047", color2: "#E53935" }],
  [/fresa/i, { kind: "heart", color: "#E53950" }],
  [/oreo/i, { kind: "disc", color: "#222", color2: "#F5F5F5" }],
  [/m&m/i, { kind: "candy", color: "#E53935" }],
  [/mashmello|marshmallow|malvavisco/i, { kind: "blob", color: "#FFF" }],
  [/bocadillo/i, { kind: "square", color: "#8E1B2C" }],
  [/barquillo|waffer|wafer/i, { kind: "strip", color: "#D9A35B", color2: "#F3D29B" }],
  [/chocolate blanco/i, { kind: "drizzle", color: "#F7F1E3" }],
  [/salsa chocolate|chocolate/i, { kind: "drizzle", color: "#4A2414" }],
  [/nutella/i, { kind: "drizzle", color: "#5A2E17" }],
  [/arequipe/i, { kind: "drizzle", color: "#C68B3C" }],
];

const BASES: [RegExp, { sauce: string; cheese: boolean }][] = [
  [/nutella/i, { sauce: "#5A2E17", cheese: false }],
  [/arequipe/i, { sauce: "#C68B3C", cheese: false }],
  [/chocolate/i, { sauce: "#3E1F10", cheese: false }],
  [/pesto/i, { sauce: "#5E8C31", cheese: true }],
];

export function toppingsFrom(text: string): T[] {
  const out: T[] = [];
  for (const [re, t] of RULES) if (re.test(text) && !out.some((o) => o.kind === t.kind && o.color === t.color)) out.push(t);
  return out;
}
export function baseFrom(text: string) {
  for (const [re, b] of BASES) if (re.test(text)) return b;
  return { sauce: "#C8432B", cheese: true };
}

function rng(seed: number) { return () => ((seed = (seed * 9301 + 49297) % 233280) / 233280); }
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export function PizzaArt({ seed, base, tops, className, cheese }: { seed: string; base: { sauce: string; cheese: boolean }; tops: T[]; className?: string; cheese?: boolean }) {
  const r = rng(hash(seed) % 233280 || 1);
  const W = 300, H = 400, P = 26;
  const pieces: React.ReactElement[] = [];
  const pt = () => [P + 18 + r() * (W - 2 * P - 36), P + 18 + r() * (H - 2 * P - 36)] as const;
  tops.forEach((t, ti) => {
    const n = t.kind === "dot" || t.kind === "crumb" || t.kind === "candy" ? 26 : t.kind === "drizzle" ? 4 : 11;
    for (let i = 0; i < n; i++) {
      const [x, y] = pt();
      const rot = r() * 360;
      const k = `${ti}-${i}`;
      switch (t.kind) {
        case "disc": pieces.push(<g key={k}><circle cx={x} cy={y} r={15} fill={t.color} /><circle cx={x - 4} cy={y - 3} r={3} fill={t.color2 || "#0002"} /><circle cx={x + 5} cy={y + 4} r={2.4} fill={t.color2 || "#0002"} /></g>); break;
        case "square": pieces.push(<rect key={k} x={x - 11} y={y - 11} width={22} height={22} rx={3} fill={t.color} transform={`rotate(${rot} ${x} ${y})`} />); break;
        case "ribbon": pieces.push(<path key={k} d={`M${x - 16} ${y} q8 -12 16 0 t16 0`} stroke={t.color} strokeWidth={9} fill="none" strokeLinecap="round" transform={`rotate(${rot} ${x} ${y})`} />); break;
        case "strip": pieces.push(<g key={k} transform={`rotate(${rot} ${x} ${y})`}><rect x={x - 18} y={y - 5} width={36} height={10} rx={4} fill={t.color} /><rect x={x - 16} y={y - 1} width={32} height={2.5} fill={t.color2 || "#fff4"} /></g>); break;
        case "chunk": pieces.push(<path key={k} d={`M${x - 9} ${y - 6} l12 -4 l7 9 l-6 9 l-12 -2 z`} fill={t.color} stroke="#0001" transform={`rotate(${rot} ${x} ${y})`} />); break;
        case "mush": pieces.push(<g key={k} transform={`rotate(${rot} ${x} ${y})`}><path d={`M${x - 12} ${y} a12 9 0 0 1 24 0 z`} fill={t.color} /><rect x={x - 4} y={y} width={8} height={9} rx={2} fill={t.color} opacity={0.85} /></g>); break;
        case "shrimp": pieces.push(<path key={k} d={`M${x - 10} ${y + 6} a11 11 0 1 1 14 -14`} stroke={t.color} strokeWidth={8} fill="none" strokeLinecap="round" transform={`rotate(${rot} ${x} ${y})`} />); break;
        case "dot": pieces.push(<circle key={k} cx={x} cy={y} r={4.5} fill={t.color} />); break;
        case "ring": pieces.push(<ellipse key={k} cx={x} cy={y} rx={12} ry={8} stroke={t.color} strokeWidth={3} fill="none" transform={`rotate(${rot} ${x} ${y})`} />); break;
        case "blob": pieces.push(<path key={k} d={`M${x} ${y - 13} c12 0 16 10 9 17 c-6 7 -18 6 -21 -2 c-3 -8 2 -15 12 -15 z`} fill={t.color} opacity={0.95} />); break;
        case "crumb": pieces.push(<circle key={k} cx={x} cy={y} r={3 + r() * 3} fill={t.color} />); break;
        case "mix": pieces.push(<rect key={k} x={x - 6} y={y - 3} width={12} height={6} rx={2} fill={i % 2 ? t.color : t.color2} transform={`rotate(${rot} ${x} ${y})`} />); break;
        case "heart": pieces.push(<path key={k} d={`M${x} ${y + 8} l-9 -9 a5 5 0 0 1 9 -6 a5 5 0 0 1 9 6 z`} fill={t.color} />); break;
        case "candy": pieces.push(<circle key={k} cx={x} cy={y} r={5} fill={["#E53935", "#FDD835", "#1E88E5", "#43A047", "#FB8C00", "#6D4C41"][i % 6]} />); break;
        case "drizzle": pieces.push(<path key={k} d={`M${P + 10} ${y} q30 -20 60 0 t60 0 t60 0 t60 0`} stroke={t.color} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.9} />); break;
      }
    }
  });
  const showCheese = cheese ?? base.cheese;
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id={`c${hash(seed)}`} cx="50%" cy="45%" r="70%"><stop offset="0" stopColor="#FFF3C4" /><stop offset="1" stopColor="#F2C46B" /></radialGradient>
      </defs>
      <rect x={6} y={6} width={W - 12} height={H - 12} rx={22} fill="#C98B3E" />
      <rect x={10} y={10} width={W - 20} height={H - 20} rx={20} fill="#E2A956" />
      <rect x={P} y={P} width={W - 2 * P} height={H - 2 * P} rx={10} fill={base.sauce} />
      {showCheese && <rect x={P + 4} y={P + 4} width={W - 2 * P - 8} height={H - 2 * P - 8} rx={12} fill={`url(#c${hash(seed)})`} opacity={0.92} />}
      {pieces}
    </svg>
  );
}
