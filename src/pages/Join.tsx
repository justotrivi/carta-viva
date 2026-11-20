import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { rpc, saveToken } from "../lib/api";
import { MESES, cop, diasDoble } from "../lib/format";
import { useMenu } from "../lib/useTenant";
import { BySocial, Loading, Logo, Missing } from "../components/ui";

export default function Join() {
  const { slug = "" } = useParams();
  const { menu, state } = useMenu(slug);
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [mode, setMode] = useState<"nuevo" | "recuperar">(sp.get("ya") ? "recuperar" : "nuevo");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (state === "loading" && !menu) return <Loading />;
  if (!menu) return <Missing text="Esta carta no existe" />;
  const t = menu.tenant, c = t.config;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r = mode === "nuevo"
        ? await rpc("register_member", { p_slug: slug, p_name: name, p_phone: phone, p_day: +day, p_month: +month, p_consent: ok })
        : await rpc("recover_member", { p_slug: slug, p_phone: phone, p_day: +day, p_month: +month });
      if (!r.ok) {
        setErr(r.error);
        if (r.exists) setMode("recuperar");
        return;
      }
      saveToken(slug, r.token);
      nav(`/${slug}/t/${r.token}${mode === "nuevo" ? "?nueva=1" : ""}`, { replace: true });
    } catch {
      setErr("No hay conexión. Intenta de nuevo.");
    } finally { setBusy(false); }
  }

  return (
    <div className="page narrow">
      <div className="top-nav"><Link to={`/${slug}`} className="link">← Carta</Link></div>
      <div className="center" style={{ margin: "8px 0 26px" }}><Logo tenant={t} size="sm" /></div>

      <div className="lbl">{c.card_name}</div>
      <h1 className="title-xl">{mode === "nuevo" ? "Cada visita suma" : "Recupera tu tarjeta"}</h1>
      {mode === "nuevo" && (
        <p className="muted" style={{ marginTop: 8 }}>
          {c.card_size} visitas por tarjeta y regalos en el camino: {c.rewards.map((r) => `visita ${r.visit}, ${r.title.toLowerCase()}`).join("; ")}.
          Sin app y sin papel.
        </p>
      )}

      <div className="seg" style={{ marginTop: 20 }}>
        <button className={mode === "nuevo" ? "on" : ""} onClick={() => { setMode("nuevo"); setErr(""); }}>Soy nuevo</button>
        <button className={mode === "recuperar" ? "on" : ""} onClick={() => { setMode("recuperar"); setErr(""); }}>Ya tengo tarjeta</button>
      </div>

      <form onSubmit={submit} className="form">
        {mode === "nuevo" && (
          <label className="field"><span className="lbl">Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required minLength={2} />
          </label>
        )}
        <label className="field"><span className="lbl">WhatsApp</span>
          <div className="prefix"><span>+57</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ""))} inputMode="tel" placeholder="300 123 4567" required autoComplete="tel-national" />
          </div>
        </label>
        <div className="field"><span className="lbl">Cumpleaños</span>
          <div className="row2">
            <select value={day} onChange={(e) => setDay(e.target.value)} required aria-label="Día">
              <option value="">Día</option>
              {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(e.target.value)} required aria-label="Mes">
              <option value="">Mes</option>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m[0].toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
        </div>
        {mode === "nuevo" && (
          <label className="check">
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} required />
            <span>Autorizo a {t.name} a tratar mis datos para el programa de fidelización según la Ley 1581 de 2012. Puedo retirarme cuando quiera.</span>
          </label>
        )}
        {err && <div className="msg err">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? "Un momento" : mode === "nuevo" ? "Crear mi tarjeta" : "Abrir mi tarjeta"}</button>
      </form>

      {mode === "nuevo" && (
        <div className="small-rules">
          <div className="lbl">Cómo funciona</div>
          <p>Un sello por visita con consumo desde {cop(c.min_amount)}. De {diasDoble(c.double_days)} tu visita vale doble, y si traes a alguien nuevo que se registre, también. En tu mes de cumpleaños hay sorpresa.</p>
        </div>
      )}
      <BySocial />
    </div>
  );
}
