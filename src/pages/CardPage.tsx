import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import { clearToken, rpc, saveToken, type Card } from "../lib/api";
import { REASON, U, W, extras, fecha, fechaCorta, plural, reglas } from "../lib/format";
import { useMenu } from "../lib/useTenant";
import { BySocial, Loading, Logo, Missing, Modal, Stamps } from "../components/ui";

export default function CardPage() {
  const { slug = "", token = "" } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { menu } = useMenu(slug);
  const [card, setCard] = useState<Card | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");
  const [qr, setQr] = useState(false);
  const [help, setHelpRaw] = useState(!!sp.get("nueva"));
  const setHelp = (v: boolean) => { setHelpRaw(v); if (!v && sp.get("nueva")) nav(`/${slug}/t/${token}`, { replace: true }); };
  const [leave, setLeave] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await rpc<Card | null>("get_card", { p_token: token });
      if (!c) { clearToken(slug); return setState("missing"); }
      saveToken(slug, token);
      setCard(c); setState("ok");
    } catch { setState((s) => (s === "ok" ? "ok" : "error")); }
  }, [token, slug]);

  useEffect(() => { load(); }, [load]);
  // Se actualiza sola cuando el mesero sella
  useEffect(() => {
    const i = setInterval(load, 15000);
    const v = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", v);
    return () => { clearInterval(i); document.removeEventListener("visibilitychange", v); };
  }, [load]);

  if (state === "loading" || !menu) return <Loading text="Abriendo tu tarjeta" />;
  if (state === "missing") return <Missing text="Esta tarjeta ya no existe" />;
  if (!card) return <Missing text="Sin conexión" />;

  const t = menu.tenant, c = t.config;
  const giftVisits = c.rewards.map((r) => r.visit);
  const next = card.rewards.find((r) => r.visit > card.stamps);
  const faltan = next ? next.visit - card.stamps : 0;
  const ready = card.rewards.filter((r) => r.status === "listo").length + card.pending_rewards.length;
  const link = `${location.origin}/${slug}/t/${token}`;

  return (
    <div className="page narrow">
      <div className="top-nav"><Link to={`/${slug}`} className="link">← Carta</Link><span className="lbl">{card.code}</span></div>
      <div className="center" style={{ margin: "4px 0 22px" }}><Logo tenant={t} size="sm" /></div>

      <div className="row-between">
        <div className="lbl">Hola, {card.name.split(" ")[0]}</div>
        <div className="lbl">Nivel {card.level.tier?.name}</div>
      </div>

      <div className="card">
        <div className="row-between">
          <div>
            <div className="lbl tiny">{t.name}</div>
            <div className="title-lg">{c.card_name}</div>
          </div>
          <div className="right">
            <div className="big-num">{card.stamps}/{card.card_size}</div>
            <div className="lbl tiny">{U(c).p}</div>
          </div>
        </div>
        <Stamps stamps={card.stamps} size={card.card_size} rewards={giftVisits} />
        <div className="lbl tiny">
          {next ? `${U(c).falta(faltan)} para: ${next.title}` : "Tarjeta completa. Canjea tu regalo."}
        </div>
        <div className="bar"><i style={{ width: `${(card.stamps / card.card_size) * 100}%` }} /></div>
      </div>

      {card.birthday_pending && (
        <div className="msg">Es tu mes de cumpleaños: en tu próxima {U(c).s} tienes un sello extra y {c.birthday_gift.toLowerCase()}.</div>
      )}

      <button className="btn" onClick={() => setQr(true)}>{W(c).tienda ? "Mostrar mi código en caja" : "Mostrar mi código al mesero"}</button>
      {ready > 0 && <p className="center muted small" style={{ marginTop: 8 }}>Tienes {ready} {plural(ready, "regalo listo", "regalos listos")}. Muéstrale tu código al mesero para canjear.</p>}

      <section className="block">
        <div className="lbl">Tus regalos</div>
        {card.rewards.map((r) => (
          <div key={r.visit} className={`li ${r.status}`}>
            <div className="n">{r.visit}</div>
            <div className="grow">
              <b>{r.title}</b>
              {r.status === "listo" && <span className="tag inv">Listo</span>}
              {r.status === "canjeado" && <span className="tag">Canjeado</span>}
              {r.status === "vencido" && <span className="tag">Vencido</span>}
              <small>{r.status === "listo" ? `Válido hasta el ${fecha(r.expires_at)}` : r.desc}</small>
            </div>
          </div>
        ))}
        {card.pending_rewards.map((r) => (
          <div key={r.id} className="li listo">
            <div className="n">{r.visit}</div>
            <div className="grow"><b>{r.title}</b><span className="tag inv">Listo</span><small>De tu tarjeta anterior. Válido hasta el {fecha(r.expires_at)}</small></div>
          </div>
        ))}
      </section>

      {c.tiers.length > 1 && <section className="block">
        <div className="lbl">Niveles · {U(c).n(card.level.visits_year)} este año</div>
        <div className="tiers">
          {c.tiers.map((tr) => (
            <div key={tr.name} className={`tier ${card.level.tier?.name === tr.name ? "cur" : ""}`}>
              <div className="lbl tiny">{tr.min}+ {U(c).p}{card.level.tier?.name === tr.name ? " · tú" : ""}</div>
              <div className="title-md">{tr.name}</div>
              <ul>{tr.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>}

      <section className="block">
        {extras(c).length > 0 && <div className="lbl">Sellos extra</div>}
        {extras(c).map((x) => <div key={x.t} className="li"><div className="n">{x.n}</div><div className="grow"><b>{x.t}</b><small>{x.d}</small></div></div>)}
        <p className="muted small" style={{ marginTop: 10 }}>{reglas(c)}</p>
      </section>

      <section className="block">
        <div className="lbl">Tu historial</div>
        {card.history.length === 0 && <p className="muted small">Aún sin sellos. La primera cuenta.</p>}
        <div className="hist">
          {card.history.map((h, i) => (
            <div key={i}><span>{fechaCorta(h.at)}</span><span>{h.reasons.map((r) => REASON[r] ?? r).join(" + ")} · +{h.stamps}</span></div>
          ))}
        </div>
      </section>

      <section className="block center">
        <button className="btn ghost" onClick={() => setHelp(true)}>Guardar mi tarjeta</button>
        <a className="btn ghost" href={`https://wa.me/57${card.phone}?text=${encodeURIComponent(`Mi ${c.card_name} de ${t.name}: ${link}`)}`} target="_blank" rel="noreferrer">Enviármela por WhatsApp</a>
        <button className="link muted small" style={{ marginTop: 18 }} onClick={() => setLeave(true)}>Salir del programa</button>
      </section>
      <BySocial />

      <QrModal open={qr} onClose={() => setQr(false)} token={token} code={card.code} who={W(c).staff} />

      <Modal open={help} onClose={() => setHelp(false)}>
        <div className="lbl">Listo, {card.name.split(" ")[0]}</div>
        <div className="title-lg" style={{ margin: "6px 0 12px" }}>Guarda tu tarjeta</div>
        <p className="small"><b>iPhone:</b> en Safari toca Compartir y luego “Agregar a inicio”.</p>
        <p className="small"><b>Android:</b> en Chrome toca los tres puntos y luego “Agregar a la pantalla principal”.</p>
        <p className="small muted">También queda guardada en este celular: cada vez que abras la carta, entra directo.</p>
        <button className="btn" onClick={() => setHelp(false)}>Entendido</button>
      </Modal>

      <Modal open={leave} onClose={() => setLeave(false)}>
        <div className="title-lg">¿Salir del programa?</div>
        <p className="small muted" style={{ margin: "10px 0" }}>Se borran tus datos, tus sellos y tus regalos. No se puede deshacer.</p>
        <button className="btn" onClick={async () => { await rpc("leave_program", { p_token: token }); clearToken(slug); nav(`/${slug}`, { replace: true }); }}>Sí, borrar mis datos</button>
        <button className="btn ghost" onClick={() => setLeave(false)}>Cancelar</button>
      </Modal>
    </div>
  );
}

function QrModal({ open, onClose, token, code, who }: { open: boolean; onClose: () => void; token: string; code: string; who: string }) {
  const [img, setImg] = useState("");
  const [left, setLeft] = useState(60);
  const [err, setErr] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await rpc<{ code: string; seconds_left: number }>("get_dynamic_code", { p_token: token });
      setImg(await QRCode.toDataURL(r.code, { margin: 1, width: 520, errorCorrectionLevel: "M" }));
      setLeft(r.seconds_left); setErr(false);
    } catch { setErr(true); }
  }, [token]);

  useEffect(() => {
    if (!open) return;
    refresh();
    const i = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(i);
  }, [open, refresh]);
  useEffect(() => { if (open && left <= 0) refresh(); }, [left, open, refresh]);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="lbl center">Muéstralo {who}</div>
      <div className="qr">{img ? <img src={img} alt="Código QR" /> : <span className="lbl pulse">Generando</span>}</div>
      <div className="title-xl center">{code}</div>
      <div className="center muted small">{err ? `Sin conexión: dile tu código ${who === "en caja" ? "a la caja" : "al mesero"}.` : `El código cambia en ${Math.max(0, left)} s`}</div>
      <button className="btn" onClick={onClose}>Listo</button>
    </Modal>
  );
}
