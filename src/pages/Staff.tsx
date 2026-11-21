import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { rpc, type Card, type Config } from "../lib/api";
import { U, cop, hora } from "../lib/format";
import { useMenu } from "../lib/useTenant";
import { BySocial, Loading, Logo, Missing, Modal, Stamps } from "../components/ui";

type Sess = { session: string; name: string; exp: number };
const SKEY = (s: string) => `cv:staff:${s}`;

export default function Staff() {
  const { slug = "" } = useParams();
  const { menu, state } = useMenu(slug);
  const [sess, setSess] = useState<Sess | null>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SKEY(slug)) || "null");
      return s && s.exp > Date.now() ? s : null;
    } catch { return null; }
  });
  const logout = useCallback(() => { try { localStorage.removeItem(SKEY(slug)); } catch { /* */ } setSess(null); }, [slug]);

  if (state === "loading" && !menu) return <Loading />;
  if (!menu) return <Missing text="Esta carta no existe" />;

  return (
    <div className="page narrow staff">
      <div className="center" style={{ margin: "10px 0 18px" }}><Logo tenant={menu.tenant} size="sm" /></div>
      {sess ? <Desk slug={slug} sess={sess} onLogout={logout} min={menu.tenant.config.min_amount} gifts={menu.tenant.config.rewards.map((r) => r.visit)} cfg={menu.tenant.config} />
            : <Login tienda={menu.tenant.config.mode === "tienda"} slug={slug} onIn={(s) => { localStorage.setItem(SKEY(slug), JSON.stringify(s)); setSess(s); }} />}
      <BySocial />
    </div>
  );
}

function Login({ slug, onIn, tienda }: { slug: string; onIn: (s: Sess) => void; tienda: boolean }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="form" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr("");
      try {
        const r = await rpc("staff_login", { p_slug: slug, p_name: name, p_pin: pin });
        if (!r.ok) return setErr(r.error);
        onIn({ session: r.session, name: r.name, exp: Date.now() + 12 * 3600e3 });
      } catch { setErr("Sin conexión."); } finally { setBusy(false); }
    }}>
      <div className="lbl">{tienda ? "Pantalla de caja" : "Pantalla del mesero"}</div>
      <h1 className="title-xl">Entrar al turno</h1>
      <label className="field"><span className="lbl">Tu nombre</span><input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="username" /></label>
      <label className="field"><span className="lbl">PIN</span><input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" type="password" required autoComplete="current-password" /></label>
      {err && <div className="msg err">{err}</div>}
      <button className="btn" disabled={busy}>Entrar</button>
    </form>
  );
}

type Found = { card: Card; stamped_today: boolean };

function Desk({ slug, sess, onLogout, min, gifts, cfg }: { slug: string; sess: Sess; onLogout: () => void; min: number; gifts: number[]; cfg: Config }) {
  const u = U(cfg);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [err, setErr] = useState("");
  const [scan, setScan] = useState(false);
  const [amount, setAmount] = useState("");
  const [table, setTable] = useState("");
  const [guest, setGuest] = useState("");
  const [result, setResult] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);

  const call = useCallback(async (fn: string, args: Record<string, unknown>) => {
    try { return await rpc(fn, { p_session: sess.session, ...args }); }
    catch (e: any) { if (e.message === "SESION_INVALIDA") onLogout(); throw e; }
  }, [sess.session, onLogout]);

  const loadRecent = useCallback(() => call("staff_recent", {}).then(setRecent).catch(() => {}), [call]);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  async function lookup(query: string) {
    if (!query.trim()) return;
    setErr(""); setResult(null); setBusy(true);
    try {
      const r = await call("staff_lookup", { p_query: query });
      if (!r.ok) { setFound(null); return setErr(r.error); }
      setFound(r); setQ("");
    } catch { setErr("Sin conexión."); } finally { setBusy(false); }
  }

  async function stamp() {
    if (!found) return;
    setBusy(true); setErr("");
    try {
      const r = await call("staff_stamp", {
        p_member_code: found.card.code, p_amount: Math.round(+amount.replace(/\D/g, "")), p_table: table, p_guest_phone: guest,
      });
      if (!r.ok) return setErr(r.error);
      setResult(r); setAmount(""); setTable(""); setGuest("");
      const again = await call("staff_lookup", { p_query: found.card.code });
      if (again.ok) setFound(again);
      loadRecent();
    } catch { setErr("Sin conexión."); } finally { setBusy(false); }
  }

  async function redeem(id: string) {
    setBusy(true); setErr("");
    try {
      const r = await call("staff_redeem", { p_reward_id: id });
      if (!r.ok) return setErr(r.error);
      setResult({ redeemed: r.title, restarted: r.card_restarted });
      const again = await call("staff_lookup", { p_query: found!.card.code });
      if (again.ok) setFound(again);
    } catch { setErr("Sin conexión."); } finally { setBusy(false); setConfirm(null); }
  }

  const c = found?.card;
  const ready = c ? [
    ...c.rewards.filter((r) => r.status === "listo").map((r) => ({ id: r.id!, title: r.title, visit: r.visit })),
    ...c.pending_rewards.map((r) => ({ id: r.id, title: r.title, visit: r.visit })),
  ] : [];

  return (
    <div>
      <div className="row-between"><span className="lbl">Turno de {sess.name}</span><button className="link small" onClick={onLogout}>Salir</button></div>

      {!found && (
        <div className="form">
          <button className="btn" onClick={() => setScan(true)}>Escanear código del cliente</button>
          <form onSubmit={(e) => { e.preventDefault(); lookup(q); }} className="field">
            <span className="lbl">O escribe el código o el WhatsApp</span>
            <div className="row2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="LU-0001 o 3001234567" autoCapitalize="characters" /><button className="btn slim" disabled={busy}>Buscar</button></div>
          </form>
          {err && <div className="msg err">{err}</div>}
        </div>
      )}

      {found && c && (
        <div className="form">
          <div className="card">
            <div className="row-between">
              <div><div className="title-lg">{c.name}</div><div className="lbl tiny">{c.code} · Nivel {c.level.tier?.name} · {u.n(c.total_visits)}</div></div>
              <div className="big-num">{c.stamps}/{c.card_size}</div>
            </div>
            <Stamps stamps={c.stamps} size={c.card_size} rewards={gifts} />
          </div>

          {c.birthday_pending && <div className="msg">Cumpleaños este mes: la próxima {u.s} suma +1.</div>}

          {result?.ok && (
            <div className="msg big">
              <b>{result.added > 0 ? `${result.added > 1 ? `${result.added} sellos registrados` : "Sello registrado"}. Va ${result.stamps}/${result.card_size}.` : `${u.cap(u.s)} registrada. La tarjeta ya está completa: canjea el regalo final.`}</b>
              {result.birthday && <div style={{ marginTop: 6 }}>Cumpleaños: {result.birthday_gift}.</div>}
              {result.unlocked?.length > 0 && <div className="unlock">Desbloqueó: {result.unlocked.map((u: any) => u.title).join(" y ")}</div>}
            </div>
          )}
          {result?.redeemed && <div className="msg big"><b>Canjeado: {result.redeemed}.</b>{result.restarted && <div>La tarjeta arranca de nuevo en 0.</div>}</div>}

          {ready.length > 0 && (
            <div className="block">
              <div className="lbl">Regalos listos para canjear</div>
              {ready.map((r) => (
                <div key={r.id} className="li listo"><div className="n">{r.visit}</div><div className="grow"><b>{r.title}</b></div>
                  <button className="btn slim" onClick={() => setConfirm({ id: r.id, title: r.title })}>Canjear</button></div>
              ))}
            </div>
          )}

          {found.stamped_today && !result?.ok ? (
            <div className="msg err">Ya sumó sello hoy. Puedes canjear regalos, pero no sellar otra vez.</div>
          ) : !result?.ok && (
            <form onSubmit={(e) => { e.preventDefault(); stamp(); }} className="block">
              <div className="lbl">Sellar {u.s}</div>
              <label className="field"><span className="lbl tiny">{min > 0 ? `Valor de la cuenta sin impuesto al consumo (mínimo ${cop(min)})` : "Valor de la compra"}</span>
                <input value={amount ? cop(+amount.replace(/\D/g, "")) : ""} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="$0" required /></label>
              <div className="row2">
                <label className="field"><span className="lbl tiny">Mesa (opcional)</span><input value={table} onChange={(e) => setTable(e.target.value)} /></label>
                {cfg.referral_bonus !== false && <label className="field"><span className="lbl tiny">WhatsApp invitado nuevo</span><input value={guest} onChange={(e) => setGuest(e.target.value)} inputMode="tel" placeholder="Opcional" /></label>}
              </div>
              {err && <div className="msg err">{err}</div>}
              <button className="btn" disabled={busy}>Sellar {u.s}</button>
            </form>
          )}
          {err && (found.stamped_today || result?.ok) && <div className="msg err">{err}</div>}
          <button className="btn ghost" onClick={() => { setFound(null); setResult(null); setErr(""); }}>Siguiente cliente</button>
        </div>
      )}

      <section className="block">
        <div className="lbl">Últimos sellos</div>
        {recent.length === 0 && <p className="muted small">Aún no hay sellos en este turno.</p>}
        <table className="tbl">
          <tbody>
            {recent.map((r, i) => (
              <tr key={i}><td>{hora(r.at)}</td><td>{r.name}</td><td>{cop(r.amount)}</td><td>+{r.stamps}</td><td className="muted">{r.staff}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <Modal open={!!confirm} onClose={() => setConfirm(null)}>
        <div className="title-lg">¿Canjear {confirm?.title}?</div>
        <p className="muted small" style={{ margin: "8px 0" }}>Queda registrado a tu nombre.</p>
        <button className="btn" disabled={busy} onClick={() => confirm && redeem(confirm.id)}>Sí, canjear</button>
        <button className="btn ghost" onClick={() => setConfirm(null)}>Cancelar</button>
      </Modal>

      {scan && <Scanner onClose={() => setScan(false)} onCode={(code) => { setScan(false); lookup(code); }} />}
    </div>
  );
}

function Scanner({ onClose, onCode }: { onClose: () => void; onCode: (c: string) => void }) {
  const ref = useRef<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let stopped = false;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped) return;
      const h = new Html5Qrcode("qr-reader");
      ref.current = h;
      h.start({ facingMode: "environment" }, { fps: 10, qrbox: 240 }, (txt) => {
        h.stop().catch(() => {}).finally(() => onCode(txt));
      }, () => {}).catch(() => setErr("No pudimos abrir la cámara. Revisa el permiso o escribe el código."));
    });
    return () => { stopped = true; ref.current?.isScanning && ref.current.stop().catch(() => {}); };
  }, [onCode]);
  return (
    <Modal open onClose={onClose}>
      <div className="lbl center">Apunta al código del cliente</div>
      <div id="qr-reader" className="reader" />
      {err && <div className="msg err">{err}</div>}
      <button className="btn ghost" onClick={onClose}>Cancelar</button>
    </Modal>
  );
}
