import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { rpc, supabase, type Config } from "../lib/api";
import { DIAS, MESES, cop, diasDoble, fecha, fechaCorta, plural, waLink } from "../lib/format";
import { applyTheme, socialTheme } from "../lib/theme";
import { Loading, Modal } from "../components/ui";

type T = { id: string; slug: string; name: string; active: boolean };
const TABS = ["Resumen", "Dormidos", "Miembros", "Reseñas", "Meseros", "Carta", "Configuración"] as const;

export default function Panel() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    socialTheme();
    document.title = "Panel · Carta Viva";
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <Loading />;
  return session ? <Dashboard /> : <Auth />;
}

function Auth() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="page narrow panel-auth">
      <div className="social-mark">#SOCIAL</div>
      <div className="lbl">Carta Viva · Panel</div>
      <h1 className="title-xl">{mode === "in" ? "Entrar" : "Crear cuenta"}</h1>
      <form className="form" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setMsg("");
        const r = mode === "in"
          ? await supabase.auth.signInWithPassword({ email, password: pass })
          : await supabase.auth.signUp({ email, password: pass, options: { emailRedirectTo: `${location.origin}/panel` } });
        setBusy(false);
        if (r.error) return setMsg(r.error.message.includes("Invalid") ? "Correo o contraseña incorrectos." : r.error.message);
        if (mode === "up" && !r.data.session) setMsg("Te enviamos un correo para confirmar la cuenta. Ábrelo y vuelve aquí.");
      }}>
        <label className="field"><span className="lbl">Correo</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label className="field"><span className="lbl">Contraseña</span><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} /></label>
        {msg && <div className="msg">{msg}</div>}
        <button className="btn" disabled={busy}>{mode === "in" ? "Entrar" : "Crear cuenta"}</button>
      </form>
      <button className="link small" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }}>
        {mode === "in" ? "¿Primera vez? Crea tu cuenta" : "Ya tengo cuenta"}
      </button>
    </div>
  );
}

function Dashboard() {
  const [tenants, setTenants] = useState<T[] | null>(null);
  const [isSuper, setSuper] = useState(false);
  const [tid, setTid] = useState<string>(() => localStorage.getItem("cv:panel:tenant") || "");
  const [tab, setTab] = useState<(typeof TABS)[number] | "Marcas">("Resumen");

  const loadTenants = useCallback(async () => {
    const sup = await rpc<boolean>("claim_first_admin");
    setSuper(sup);
    const ts = await rpc<T[]>("my_tenants");
    setTenants(ts);
    if (!ts.find((t) => t.id === tid) && ts[0]) setTid(ts[0].id);
  }, [tid]);
  useEffect(() => { loadTenants().catch(() => setTenants([])); }, []); // eslint-disable-line
  useEffect(() => { if (tid) localStorage.setItem("cv:panel:tenant", tid); }, [tid]);

  if (!tenants) return <Loading />;
  const cur = tenants.find((t) => t.id === tid);

  return (
    <div className="page panel">
      <header className="panel-head">
        <div>
          <div className="social-mark small">#SOCIAL</div>
          <div className="lbl">Carta Viva · Panel</div>
        </div>
        <div className="panel-tools">
          {tenants.length > 1 && (
            <select value={tid} onChange={(e) => setTid(e.target.value)} aria-label="Marca">
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {cur && <a className="link small" href={`/${cur.slug}`} target="_blank" rel="noreferrer">Ver carta ↗</a>}
          <button className="link small" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>

      {!cur && !isSuper && (
        <div className="empty">
          <div className="title-lg">Tu cuenta aún no tiene una marca asignada</div>
          <p className="muted">Pídele a SOCIAL que te dé acceso con este correo.</p>
        </div>
      )}

      <nav className="tabs">
        {cur && TABS.map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}
        {isSuper && <button className={tab === "Marcas" ? "on" : ""} onClick={() => setTab("Marcas")}>Marcas</button>}
      </nav>

      <main className="panel-main">
        {tab === "Marcas" && isSuper ? <Brands tenants={tenants} onChange={loadTenants} onOpen={(id) => { setTid(id); setTab("Configuración"); }} />
          : cur ? <TenantView key={cur.id + tab} t={cur} tab={tab as (typeof TABS)[number]} /> : null}
      </main>
    </div>
  );
}

function TenantView({ t, tab }: { t: T; tab: (typeof TABS)[number] }) {
  const [stats, setStats] = useState<any>(null);
  const reload = useCallback(() => rpc("admin_stats", { p_tenant: t.id }).then(setStats), [t.id]);
  useEffect(() => { reload(); }, [reload]);
  if (!stats) return <Loading />;
  const cfg: Config = stats.config;
  switch (tab) {
    case "Resumen": return <Summary s={stats} />;
    case "Dormidos": return <Dormant s={stats} t={t} />;
    case "Miembros": return <Members t={t} cfg={cfg} />;
    case "Reseñas": return <Reviews t={t} />;
    case "Meseros": return <StaffAdmin t={t} />;
    case "Carta": return <MenuAdmin t={t} />;
    case "Configuración": return <Settings t={t} cfg={cfg} onSaved={reload} />;
  }
}

function Summary({ s }: { s: any }) {
  const pct = s.members ? Math.round((s.returned / s.members) * 100) : 0;
  const maxDow = Math.max(1, ...s.by_dow.map((d: any) => d.count));
  const mes = MESES[new Date().getMonth()];
  return (
    <div>
      <h2 className="title-xl">Tus clientes que vuelven</h2>
      <p className="muted">Datos reales de la tarjeta. Mes de {mes}.</p>
      <div className="kpis">
        <Kpi l="Miembros" v={s.members} sub={`+${s.new_members} este mes`} />
        <Kpi l="Volvieron este mes" v={`${pct}%`} sub={`${s.returned} de ${s.members}`} />
        <Kpi l="Visitas selladas" v={s.visits_month} sub="este mes" />
        <Kpi l="Ticket promedio" v={cop(s.avg_ticket)} sub="visitas selladas del mes" />
      </div>
      <div className="grid2">
        <div className="box">
          <div className="lbl">Regalos canjeados este mes</div>
          {s.redeemed.length === 0 ? <p className="muted small">Todavía ninguno.</p> :
            <table className="tbl"><tbody>{s.redeemed.map((r: any) => <tr key={r.title}><td>{r.title}</td><td className="right">{r.count}</td></tr>)}</tbody></table>}
        </div>
        <div className="box">
          <div className="lbl">Visitas por día (últimos 90 días)</div>
          {s.by_dow.length === 0 ? <p className="muted small">Aún sin visitas.</p> : (
            <div className="bars">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const n = s.by_dow.find((x: any) => x.dow === d)?.count ?? 0;
                return <div key={d} className="bar-col"><div className="bar-v" style={{ height: `${(n / maxDow) * 100}%` }} /><span>{DIAS[d].slice(0, 3)}</span><b>{n}</b></div>;
              })}
            </div>
          )}
        </div>
      </div>
      <div className="box">
        <div className="lbl">Aquí se te están yendo</div>
        <p><b>{s.dormant.length}</b> {plural(s.dormant.length, "cliente lleva", "clientes llevan")} más de {s.config.dormant_days} días sin volver. Revísalos en la pestaña Dormidos.</p>
      </div>
    </div>
  );
}

const Kpi = ({ l, v, sub }: { l: string; v: any; sub: string }) => (
  <div className="kpi"><div className="lbl">{l}</div><div className="kpi-v">{v}</div><div className="muted small">{sub}</div></div>
);

function dormantMsg(name: string, stamps: number, cfg: Config, tname: string) {
  const next = cfg.rewards.find((r) => r.visit > stamps) ?? cfg.rewards[cfg.rewards.length - 1];
  const f = next.visit - stamps;
  return `Hola ${name.split(" ")[0]}, te extrañamos en ${tname}. Llevas ${stamps} de ${cfg.card_size} sellos en tu tarjeta. ${f === 1 ? "Te falta 1 visita" : `Te faltan ${f} visitas`} para tu regalo: ${next.title}. ${cfg.double_days.length ? `De ${diasDoble(cfg.double_days)} tu visita vale doble. ` : ""}¿Te guardamos mesa? Responde este mensaje y te reservamos.`;
}

function Dormant({ s, t }: { s: any; t: T }) {
  const [sel, setSel] = useState<any>(null);
  const [txt, setTxt] = useState("");
  return (
    <div>
      <h2 className="title-xl">Clientes dormidos</h2>
      <p className="muted">Más de {s.config.dormant_days} días sin volver. Prepara el WhatsApp, ajústalo si quieres y envíalo.</p>
      {s.dormant.length === 0 ? <div className="empty"><div className="title-lg">Nadie dormido por ahora</div><p className="muted">Cuando alguien pase {s.config.dormant_days} días sin venir, aparece aquí.</p></div> : (
        <table className="tbl">
          <thead><tr><th>Cliente</th><th>Sellos</th><th>Visitas</th><th>Última</th><th></th></tr></thead>
          <tbody>{s.dormant.map((m: any) => (
            <tr key={m.id}><td>{m.name}<div className="muted tiny">{m.code}</div></td><td>{m.stamps}</td><td>{m.visits}</td><td>{m.days} días</td>
              <td><button className="btn slim ghost" onClick={() => { setSel(m); setTxt(dormantMsg(m.name, m.stamps, s.config, t.name)); }}>Preparar WhatsApp</button></td></tr>
          ))}</tbody>
        </table>
      )}
      <Modal open={!!sel} onClose={() => setSel(null)}>
        <div className="lbl">Para {sel?.name}</div>
        <textarea className="ta" value={txt} onChange={(e) => setTxt(e.target.value)} rows={8} />
        <a className="btn" href={sel ? waLink(sel.phone, txt) : "#"} target="_blank" rel="noreferrer" onClick={() => setTimeout(() => setSel(null), 300)}>Abrir en WhatsApp</a>
        <button className="btn ghost" onClick={() => setSel(null)}>Cancelar</button>
      </Modal>
    </div>
  );
}

function Members({ t, cfg }: { t: T; cfg: Config }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<any>(null);
  useEffect(() => {
    supabase.from("members").select("id,code,name,phone,bday_day,bday_month,stamps,total_visits,last_visit_at,created_at")
      .eq("tenant_id", t.id).order("created_at", { ascending: false }).limit(5000)
      .then(({ data }) => setRows(data ?? []));
  }, [t.id]);
  const list = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (rows ?? []).filter((r) => !s || `${r.name} ${r.code} ${r.phone}`.toLowerCase().includes(s));
  }, [rows, q]);
  function csv() {
    const head = ["codigo", "nombre", "whatsapp", "cumpleanos", "sellos", "visitas", "ultima_visita", "registro"];
    const lines = (rows ?? []).map((r) => [r.code, r.name, r.phone, `${r.bday_day}/${r.bday_month}`, r.stamps, r.total_visits, r.last_visit_at ?? "", r.created_at]
      .map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `miembros-${t.slug}.csv`; a.click();
  }
  if (!rows) return <Loading />;
  return (
    <div>
      <div className="row-between"><h2 className="title-xl">Miembros · {rows.length}</h2><button className="btn slim ghost" onClick={csv} disabled={!rows.length}>Exportar CSV</button></div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, código o WhatsApp" className="search-in" />
      {rows.length === 0 ? <div className="empty"><div className="title-lg">Aún no hay miembros</div><p className="muted">Se registran desde la carta, en el botón “{cfg.card_name}”.</p></div> : (
        <table className="tbl">
          <thead><tr><th>Cliente</th><th>WhatsApp</th><th>Sellos</th><th>Visitas</th><th>Última visita</th></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.id} className="click" onClick={() => rpc("admin_member_detail", { p_member: r.id }).then(setDetail)}>
              <td>{r.name}<div className="muted tiny">{r.code} · cumple {r.bday_day} {MESES[r.bday_month - 1]}</div></td>
              <td>{r.phone}</td><td>{r.stamps}/{cfg.card_size}</td><td>{r.total_visits}</td><td>{fechaCorta(r.last_visit_at) || "—"}</td></tr>
          ))}</tbody>
        </table>
      )}
      <Modal open={!!detail} onClose={() => setDetail(null)}>
        {detail && <>
          <div className="lbl">{detail.code} · Nivel {detail.level.tier?.name}</div>
          <div className="title-lg">{detail.name}</div>
          <p className="small muted">Miembro desde {fecha(detail.created_at)} · {detail.total_visits} visitas · tarjeta #{detail.card_number}</p>
          <div className="lbl" style={{ marginTop: 12 }}>Regalos</div>
          {detail.rewards.map((r: any) => <div key={r.visit} className="small">{r.visit} · {r.title} — {r.status}</div>)}
          <div className="lbl" style={{ marginTop: 12 }}>Historial</div>
          <div className="hist">{detail.history.map((h: any, i: number) => <div key={i}><span>{fechaCorta(h.at)}</span><span>+{h.stamps}</span></div>)}</div>
          <button className="btn ghost" onClick={() => setDetail(null)}>Cerrar</button>
        </>}
      </Modal>
    </div>
  );
}

function Reviews({ t }: { t: T }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    supabase.from("feedback").select("id,stars,comment,table_no,created_at").eq("tenant_id", t.id).order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setRows(data ?? []));
  }, [t.id]);
  if (!rows) return <Loading />;
  const priv = rows.filter((r) => r.stars < 4);
  const avg = rows.length ? (rows.reduce((s, r) => s + r.stars, 0) / rows.length).toFixed(1) : "—";
  return (
    <div>
      <h2 className="title-xl">Reseñas</h2>
      <p className="muted">Las de 4 y 5 estrellas se mandan a Google. Las de 1 a 3 llegan solo aquí, en privado.</p>
      <div className="kpis">
        <Kpi l="Calificaciones" v={rows.length} sub="desde la carta" />
        <Kpi l="Promedio" v={avg} sub="de 5 estrellas" />
        <Kpi l="Enviadas a Google" v={rows.length - priv.length} sub="4 y 5 estrellas" />
        <Kpi l="Privadas" v={priv.length} sub="1 a 3 estrellas" />
      </div>
      {priv.length === 0 ? <div className="empty"><div className="title-lg">Sin quejas privadas</div><p className="muted">Cuando alguien califique con 1 a 3 estrellas, su comentario aparece aquí.</p></div> : (
        <table className="tbl"><thead><tr><th>Fecha</th><th>Estrellas</th><th>Mesa</th><th>Comentario</th></tr></thead>
          <tbody>{priv.map((r) => <tr key={r.id}><td>{fechaCorta(r.created_at)}</td><td>{"★".repeat(r.stars)}</td><td>{r.table_no || "—"}</td><td>{r.comment || <span className="muted">Sin comentario</span>}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}

function StaffAdmin({ t }: { t: T }) {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(() => supabase.from("staff").select("id,name,active,created_at").eq("tenant_id", t.id).order("name").then(({ data }) => setRows(data ?? [])), [t.id]);
  useEffect(() => { load(); }, [load]);
  async function save(args: any) {
    const r = await rpc("admin_save_staff", { p_tenant: t.id, p_id: null, p_name: null, p_pin: null, p_active: null, ...args });
    setMsg(r.ok ? "Guardado." : r.error); load();
  }
  return (
    <div>
      <h2 className="title-xl">Meseros</h2>
      <p className="muted">Cada mesero entra en <b>{location.origin}/{t.slug}/mesero</b> con su nombre y su PIN. Cada sello queda a su nombre.</p>
      <form className="row-form" onSubmit={(e) => { e.preventDefault(); save({ p_name: name, p_pin: pin }).then(() => { setName(""); setPin(""); }); }}>
        <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="PIN de 4 números" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" required />
        <button className="btn slim">Agregar</button>
      </form>
      {msg && <div className="msg">{msg}</div>}
      <table className="tbl">
        <thead><tr><th>Nombre</th><th>Estado</th><th></th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}><td>{r.name}</td><td>{r.active ? "Activo" : "Inactivo"}</td>
            <td className="right">
              <button className="link small" onClick={() => { const p = window.prompt?.(`Nuevo PIN para ${r.name} (4 números)`); if (p) save({ p_id: r.id, p_pin: p }); }}>Cambiar PIN</button>{" · "}
              <button className="link small" onClick={() => save({ p_id: r.id, p_active: !r.active })}>{r.active ? "Desactivar" : "Activar"}</button>
            </td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function MenuAdmin({ t }: { t: T }) {
  const [cats, setCats] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [imp, setImp] = useState(false);
  const [json, setJson] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const [c, d] = await Promise.all([
      supabase.from("categories").select("*").eq("tenant_id", t.id).order("sort"),
      supabase.from("dishes").select("*").eq("tenant_id", t.id).order("sort"),
    ]);
    setCats(c.data ?? []); setDishes(d.data ?? []);
  }, [t.id]);
  useEffect(() => { load(); }, [load]);

  async function saveDish(d: any) {
    const { id, ...rest } = d;
    const row = { ...rest, tenant_id: t.id, price: rest.price === "" || rest.price == null ? null : +rest.price, price2: rest.price2 === "" || rest.price2 == null ? null : +rest.price2 };
    const r = id ? await supabase.from("dishes").update(row).eq("id", id) : await supabase.from("dishes").insert(row);
    if (r.error) return setMsg(r.error.message);
    setEdit(null); load();
  }
  async function upload(file: File) {
    const ext = file.name.split(".").pop();
    const path = `${t.id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("media").upload(path, file, { upsert: false, contentType: file.type });
    if (up.error) return setMsg(up.error.message);
    const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
    setEdit((e: any) => ({ ...e, media_url: url, media_type: file.type.startsWith("video") ? "video" : "image" }));
  }

  return (
    <div>
      <div className="row-between"><h2 className="title-xl">Carta</h2>
        <div><button className="btn slim ghost" onClick={() => setImp(true)}>Importar carta (JSON)</button></div></div>
      <p className="muted">Toca un plato para cambiar precio, texto, foto o video. Lo que apagues deja de verse en la carta al instante.</p>
      {msg && <div className="msg err">{msg}</div>}
      {cats.map((c) => (
        <div key={c.id} className="box">
          <div className="row-between"><div className="title-lg">{c.name}</div>
            <button className="link small" onClick={() => setEdit({ category_id: c.id, name: "", portion: "", description: "", price: "", price2: "", sort: dishes.filter((d) => d.category_id === c.id).length + 1, available: true, star: false, show: false })}>+ Plato</button></div>
          <table className="tbl">
            <tbody>{dishes.filter((d) => d.category_id === c.id).map((d) => (
              <tr key={d.id} className={`click ${d.available ? "" : "off"}`} onClick={() => setEdit({ ...d, price: d.price ?? "", price2: d.price2 ?? "" })}>
                <td>{d.name}{d.media_url && <span className="tag">{d.media_type === "video" ? "Video" : "Foto"}</span>}{!d.available && <span className="tag">Apagado</span>}</td>
                <td className="right">{cop(d.price)}{d.price2 ? ` / ${cop(d.price2)}` : ""}</td></tr>
            ))}</tbody>
          </table>
        </div>
      ))}

      <Modal open={!!edit} onClose={() => setEdit(null)}>
        {edit && <form className="form" onSubmit={(e) => { e.preventDefault(); saveDish(edit); }}>
          <div className="lbl">{edit.id ? "Editar plato" : "Nuevo plato"}</div>
          <label className="field"><span className="lbl tiny">Nombre</span><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></label>
          <label className="field"><span className="lbl tiny">Porción (ej. 250 g · o “con queso / con chicharrón” si hay 2 precios)</span><input value={edit.portion ?? ""} onChange={(e) => setEdit({ ...edit, portion: e.target.value })} /></label>
          <label className="field"><span className="lbl tiny">Descripción</span><textarea className="ta" rows={3} value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></label>
          <div className="row2">
            <label className="field"><span className="lbl tiny">Precio</span><input inputMode="numeric" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value.replace(/\D/g, "") })} /></label>
            <label className="field"><span className="lbl tiny">Precio 2</span><input inputMode="numeric" value={edit.price2} onChange={(e) => setEdit({ ...edit, price2: e.target.value.replace(/\D/g, "") })} /></label>
          </div>
          <div className="checks">
            <label><input type="checkbox" checked={edit.available} onChange={(e) => setEdit({ ...edit, available: e.target.checked })} /> Disponible</label>
            <label><input type="checkbox" checked={edit.star} onChange={(e) => setEdit({ ...edit, star: e.target.checked })} /> Favorito de la casa</label>
            <label><input type="checkbox" checked={edit.show} onChange={(e) => setEdit({ ...edit, show: e.target.checked })} /> Show en mesa</label>
          </div>
          <label className="field"><span className="lbl tiny">Foto o video vertical</span><input type="file" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
          {edit.media_url && <div className="row-between small"><span>{edit.media_type === "video" ? "Video cargado" : "Foto cargada"}</span><button type="button" className="link small" onClick={() => setEdit({ ...edit, media_url: null, media_type: null })}>Quitar</button></div>}
          <button className="btn">Guardar</button>
          {edit.id && <button type="button" className="link small" onClick={async () => { await supabase.from("dishes").delete().eq("id", edit.id); setEdit(null); load(); }}>Eliminar plato</button>}
        </form>}
      </Modal>

      <Modal open={imp} onClose={() => setImp(false)}>
        <div className="lbl">Importar carta</div>
        <p className="small muted">Pega la carta en el formato de SOCIAL (categorias → platos con n, g, p, p2, d). Reemplaza la carta actual completa.</p>
        <textarea className="ta mono" rows={10} value={json} onChange={(e) => setJson(e.target.value)} placeholder='{"categorias":[{"nombre":"Entradas","platos":[{"n":"...","p":30000}]}]}' />
        <button className="btn" onClick={async () => {
          try {
            const r = await rpc("admin_import_menu", { p_tenant: t.id, p_menu: JSON.parse(json), p_replace: true });
            setMsg(""); setImp(false); setJson(""); load(); alertish(`Carta cargada: ${r.categories} categorías, ${r.dishes} platos.`);
          } catch (e: any) { setMsg(e.message.includes("JSON") ? "El JSON no es válido." : e.message); }
        }}>Reemplazar carta</button>
      </Modal>
    </div>
  );
}

function alertish(t: string) {
  const d = document.createElement("div"); d.className = "toast"; d.textContent = t;
  document.body.appendChild(d); setTimeout(() => d.remove(), 3500);
}

function Settings({ t, cfg, onSaved }: { t: T; cfg: Config; onSaved: () => void }) {
  const [c, setC] = useState<Config>(cfg);
  const [name, setName] = useState(t.name);
  const [msg, setMsg] = useState("");
  const set = (k: keyof Config, v: any) => setC({ ...c, [k]: v });
  useEffect(() => () => socialTheme(), []);
  async function save() {
    const { error } = await supabase.from("tenants").update({ name, config: c }).eq("id", t.id);
    setMsg(error ? error.message : "Guardado. Ya se ve en la carta.");
    if (!error) onSaved();
  }
  async function uploadLogo(file: File) {
    const path = `${t.id}/logo-${Date.now()}.${file.name.split(".").pop()}`;
    const up = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
    if (up.error) return setMsg(up.error.message);
    set("logo_url", supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
  }
  return (
    <div className="settings">
      <h2 className="title-xl">Configuración</h2>
      <p className="muted">Link de la carta: <b>{location.origin}/{t.slug}</b> · Meseros: <b>{location.origin}/{t.slug}/mesero</b></p>

      <div className="box">
        <div className="lbl">Marca</div>
        <div className="row2">
          <label className="field"><span className="lbl tiny">Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span className="lbl tiny">Logo (PNG transparente)</span><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} /></label>
        </div>
        {c.logo_url && <div className="row-between small"><img src={c.logo_url} alt="" style={{ height: 40, background: c.colors.bg, padding: 4 }} /><button className="link small" onClick={() => set("logo_url", null)}>Usar logo de texto</button></div>}
        <div className="row3">
          <label className="field"><span className="lbl tiny">Texto arriba</span><input value={c.logo_top ?? ""} onChange={(e) => set("logo_top", e.target.value)} /></label>
          <label className="field"><span className="lbl tiny">Texto del logo</span><input value={c.logo_text ?? ""} onChange={(e) => set("logo_text", e.target.value)} /></label>
          <label className="field"><span className="lbl tiny">Texto abajo</span><input value={c.logo_bottom ?? ""} onChange={(e) => set("logo_bottom", e.target.value)} /></label>
        </div>
        <div className="row5">
          {(["bg", "fg", "muted", "line", "accent"] as const).map((k) => (
            <label key={k} className="field"><span className="lbl tiny">{{ bg: "Fondo", fg: "Texto", muted: "Secundario", line: "Líneas", accent: "Acento" }[k]}</span>
              <input type="color" value={c.colors[k]} onChange={(e) => set("colors", { ...c.colors, [k]: e.target.value })} /></label>
          ))}
        </div>
        <div className="row2">
          <label className="field"><span className="lbl tiny">Tipografía títulos (Google Fonts)</span><input value={c.fonts.title} onChange={(e) => set("fonts", { ...c.fonts, title: e.target.value })} /></label>
          <label className="field"><span className="lbl tiny">Tipografía textos</span><input value={c.fonts.body} onChange={(e) => set("fonts", { ...c.fonts, body: e.target.value })} /></label>
        </div>
        <button className="link small" onClick={() => applyTheme(c)}>Previsualizar colores aquí</button>
      </div>

      <div className="box">
        <div className="lbl">Datos de la carta</div>
        <label className="field"><span className="lbl tiny">Link de reservas (WhatsApp o web)</span><input value={c.reservations_url ?? ""} onChange={(e) => set("reservations_url", e.target.value)} placeholder="https://wa.link/..." /></label>
        <div className="row2">
          <label className="field"><span className="lbl tiny">Dirección</span><input value={c.address ?? ""} onChange={(e) => set("address", e.target.value)} /></label>
          <label className="field"><span className="lbl tiny">Instagram</span><input value={c.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} /></label>
        </div>
        <label className="field"><span className="lbl tiny">Nota al pie</span><input value={c.menu_note ?? ""} onChange={(e) => set("menu_note", e.target.value)} /></label>
      </div>

      <div className="box">
        <div className="lbl">Reglas de la tarjeta</div>
        <div className="row3">
          <label className="field"><span className="lbl tiny">Nombre de la tarjeta</span><input value={c.card_name} onChange={(e) => set("card_name", e.target.value)} /></label>
          <label className="field"><span className="lbl tiny">Consumo mínimo por sello</span><input inputMode="numeric" value={c.min_amount} onChange={(e) => set("min_amount", +e.target.value.replace(/\D/g, ""))} /></label>
          <label className="field"><span className="lbl tiny">Días de vigencia del regalo</span><input inputMode="numeric" value={c.reward_days} onChange={(e) => set("reward_days", +e.target.value.replace(/\D/g, "") || 1)} /></label>
        </div>
        <div className="field"><span className="lbl tiny">Días de doble sello</span>
          <div className="checks">{[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <label key={d}><input type="checkbox" checked={c.double_days.includes(d)} onChange={(e) => set("double_days", e.target.checked ? [...c.double_days, d].sort() : c.double_days.filter((x) => x !== d))} /> {DIAS[d]}</label>
          ))}</div>
        </div>
        <label className="field"><span className="lbl tiny">Cortesía de cumpleaños</span><input value={c.birthday_gift} onChange={(e) => set("birthday_gift", e.target.value)} /></label>
        <div className="lbl tiny" style={{ marginTop: 10 }}>Regalos ({c.card_size} sellos por tarjeta; el último reinicia la tarjeta)</div>
        {c.rewards.map((r, i) => (
          <div key={i} className="row3">
            <label className="field"><span className="lbl tiny">Visita</span><input inputMode="numeric" value={r.visit} onChange={(e) => set("rewards", c.rewards.map((x, j) => j === i ? { ...x, visit: Math.min(c.card_size, +e.target.value.replace(/\D/g, "") || 1) } : x))} /></label>
            <label className="field"><span className="lbl tiny">Regalo</span><input value={r.title} onChange={(e) => set("rewards", c.rewards.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} /></label>
            <label className="field"><span className="lbl tiny">Detalle</span><input value={r.desc ?? ""} onChange={(e) => set("rewards", c.rewards.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} /></label>
          </div>
        ))}
        <div className="lbl tiny" style={{ marginTop: 10 }}>Niveles</div>
        {c.tiers.map((tr, i) => (
          <div key={i} className="row3">
            <label className="field"><span className="lbl tiny">Nombre</span><input value={tr.name} onChange={(e) => set("tiers", c.tiers.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></label>
            <label className="field"><span className="lbl tiny">Desde visitas/año</span><input inputMode="numeric" value={tr.min} onChange={(e) => set("tiers", c.tiers.map((x, j) => j === i ? { ...x, min: +e.target.value.replace(/\D/g, "") } : x))} /></label>
            <label className="field"><span className="lbl tiny">Beneficios (separados por ;)</span><input value={tr.benefits.join("; ")} onChange={(e) => set("tiers", c.tiers.map((x, j) => j === i ? { ...x, benefits: e.target.value.split(";").map((s) => s.trim()).filter(Boolean) } : x))} /></label>
          </div>
        ))}
      </div>
      {msg && <div className="msg">{msg}</div>}
      <button className="btn" onClick={save}>Guardar configuración</button>
    </div>
  );
}

function Brands({ tenants, onChange, onOpen }: { tenants: T[]; onChange: () => void; onOpen: (id: string) => void }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [email, setEmail] = useState("");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <div>
      <h2 className="title-xl">Marcas</h2>
      <p className="muted">Cada cliente de SOCIAL es una marca con su link, su carta y su tarjeta.</p>
      <table className="tbl">
        <thead><tr><th>Marca</th><th>Link</th><th></th></tr></thead>
        <tbody>{tenants.map((t) => <tr key={t.id}><td>{t.name}</td><td>/{t.slug}</td><td className="right"><button className="link small" onClick={() => onOpen(t.id)}>Configurar</button></td></tr>)}</tbody>
      </table>
      <div className="box">
        <div className="lbl">Nueva marca</div>
        <form className="row3" onSubmit={async (e) => {
          e.preventDefault();
          const r = await rpc("admin_create_tenant", { p_slug: slug, p_name: name, p_prefix: prefix });
          setMsg(r.ok ? `Marca creada. Ahora configura sus colores y carga su carta.` : r.error);
          if (r.ok) { setSlug(""); setName(""); setPrefix(""); onChange(); onOpen(r.id); }
        }}>
          <label className="field"><span className="lbl tiny">Nombre</span><input value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} required /></label>
          <label className="field"><span className="lbl tiny">Link (/{slug || "marca"})</span><input value={slug} onChange={(e) => setSlug(e.target.value)} required /></label>
          <label className="field"><span className="lbl tiny">Prefijo de códigos (ej. MG)</span><input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))} required /></label>
          <button className="btn slim">Crear marca</button>
        </form>
      </div>
      <div className="box">
        <div className="lbl">Dar acceso al dueño</div>
        <p className="small muted">El dueño primero crea su cuenta en {location.origin}/panel. Luego lo agregas aquí y solo verá su marca.</p>
        <form className="row3" onSubmit={async (e) => {
          e.preventDefault();
          const r = await rpc("admin_add_tenant_admin", { p_tenant: to, p_email: email });
          setMsg(r.ok ? "Acceso dado." : r.error);
        }}>
          <select value={to} onChange={(e) => setTo(e.target.value)} required><option value="">Marca</option>{tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <input type="email" placeholder="correo del dueño" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="btn slim">Dar acceso</button>
        </form>
      </div>
      {msg && <div className="msg">{msg}</div>}
    </div>
  );
}
