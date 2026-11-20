import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export async function rpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.message?.includes("SESION_INVALIDA")) throw new Error("SESION_INVALIDA");
    throw new Error(error.message || "Error de conexión");
  }
  return data as T;
}

// ---------- tipos ----------
export type Reward = { visit: number; title: string; desc?: string };
export type Tier = { name: string; min: number; benefits: string[] };
export type Config = {
  colors: { bg: string; fg: string; muted: string; line: string; accent: string };
  fonts: { title: string; body: string };
  logo_url?: string | null;
  logo_text?: string;
  logo_top?: string;
  logo_bottom?: string;
  address?: string;
  instagram?: string;
  reservations_url?: string;
  menu_note?: string;
  min_amount: number;
  double_days: number[];
  reward_days: number;
  dormant_days: number;
  reset_months: number;
  card_size: number;
  rewards: Reward[];
  tiers: Tier[];
  birthday_gift: string;
  card_name: string;
};
export type Tenant = { id: string; slug: string; name: string; config: Config };
export type Dish = {
  id: string; name: string; portion?: string | null; description?: string | null;
  price?: number | null; price2?: number | null; star: boolean; show: boolean;
  media_url?: string | null; media_type?: "image" | "video" | null;
};
export type Category = { id: string; name: string; note?: string | null; dishes: Dish[] };
export type Menu = { tenant: Tenant; categories: Category[] };

export type CardReward = {
  visit: number; title: string; desc?: string; id: string | null;
  status: "bloqueado" | "listo" | "canjeado" | "vencido";
  expires_at: string | null; redeemed_at: string | null;
};
export type Card = {
  id: string; code: string; name: string; phone: string; stamps: number; card_size: number;
  card_number: number; total_visits: number; last_visit_at: string | null; created_at: string;
  bday_day: number; bday_month: number; birthday_month: boolean; birthday_pending: boolean;
  level: { visits_year: number; tier: Tier | null; next: Tier | null };
  rewards: CardReward[];
  pending_rewards: { id: string; visit: number; title: string; expires_at: string }[];
  history: { at: string; stamps: number; reasons: string[] }[];
};

// ---------- tarjeta guardada en este celular ----------
const KEY = (slug: string) => `cv:card:${slug}`;
export const savedToken = (slug: string) => {
  try { return localStorage.getItem(KEY(slug)); } catch { return null; }
};
export const saveToken = (slug: string, token: string) => {
  try { localStorage.setItem(KEY(slug), token); } catch { /* sin almacenamiento */ }
};
export const clearToken = (slug: string) => {
  try { localStorage.removeItem(KEY(slug)); } catch { /* */ }
};
