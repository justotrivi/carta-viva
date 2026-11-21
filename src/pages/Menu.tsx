import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { rpc, savedToken, type Card, type Config, type Dish, type Menu as MenuT } from "../lib/api";
import { U, W, cop, extras, plural } from "../lib/format";
import { useMenu } from "../lib/useTenant";
import { BySocial, Loading, Missing, Stamps } from "../components/ui";
import { PizzaArt, baseFrom, toppingsFrom } from "../components/pizza";

type Item = Dish & { cat: string; catId: string };
type Page = "feed" | "list" | "hoy" | "tarjeta" | "mesa";

const img = (x: Item) => (x.photos && x.photos[0]) || (x.media_type !== "video" ? x.media_url : null) || null;
const price = (x: Item) => (x.price2 ? <>{cop(x.price)} <small>· {cop(x.price2)}</small></> : cop(x.price));
const portion = (p: string) => (/^\d+$/.test(p) ? `${p} ${p === "1" ? "unidad" : "unidades"}` : p);

export default function Menu() {
  const { slug = "" } = useParams();
  const [sp] = useSearchParams();
  const mesa = sp.get("mesa") || "";
  const { menu, state } = useMenu(slug);
  const [page, setPage] = useState<Page>(() => (sp.get("ver") === "tarjeta" ? "tarjeta" : "feed"));
  const [splash, setSplash] = useState(() => { try { return !sessionStorage.getItem(`cv:in:${slug}`); } catch { return true; } });
  const [sheet, setSheet] = useState<React.ReactNode>(null);
  const [toast, setToast] = useState("");
  const [order, setOrder] = useState<Record<string, number>>(() => { try { return JSON.parse(localStorage.getItem(`cv:order:${slug}`) || "{}"); } catch { return {}; } });
  const [customs, setCustoms] = useState<Record<string, { name: string; price: number }>>(() => { try { return JSON.parse(localStorage.getItem(`cv:custom:${slug}`) || "{}"); } catch { return {}; } });
  useEffect(() => { try { localStorage.setItem(`cv:order:${slug}`, JSON.stringify(order)); localStorage.setItem(`cv:custom:${slug}`, JSON.stringify(customs)); } catch { /* */ } }, [order, customs, slug]);

  const items = useMemo<Item[]>(() => menu ? menu.categories.flatMap((c) => c.dishes.map((d) => ({ ...d, cat: c.name, catId: c.id }))) : [], [menu]);
  const allItems = useMemo<Item[]>(() => [...items, ...Object.entries(customs).map(([id, v]) => ({ id, name: v.name, price: v.price, star: false, show: false, cat: "", catId: "" } as Item))], [items, customs]);
  const byName = useCallback((n: string) => items.find((x) => x.name === n), [items]);

  if (state === "loading" && !menu) return <Loading />;
  if (state === "missing") return <Missing text="Esta carta no existe" />;
  if (!menu) return <Missing text="Sin conexión" />;
  const t = menu.tenant, c = t.config;

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1700); };
  const add = (id: string) => { setOrder((o) => ({ ...o, [id]: (o[id] || 0) + 1 })); say(`✓ ${allItems.find((x) => x.id === id)?.name} · ${W(c).toOrder}`); };
  const addCustom = (name: string, price: number) => { const id = `custom-${Date.now()}`; setCustoms((s) => ({ ...s, [id]: { name, price } })); setOrder((o) => ({ ...o, [id]: 1 })); say(`✓ ${name} · ${W(c).toOrder}`); };
  const openBuilder = () => c.builder && setSheet(<Builder menu={menu} c={c} onAdd={(n, p) => { addCustom(n, p); setSheet(null); }} onClose={() => setSheet(null)} />);
  const count = Object.values(order).reduce((a, b) => a + b, 0);
  const open = (x: Item) => setSheet(<DishSheet x={x} c={c} pair={c.pairings?.[x.name] ? byName(c.pairings[x.name]) : undefined}
    onAdd={() => { add(x.id); setSheet(null); }} onClose={() => setSheet(null)} />);

  const NAV: [Page, string, React.ReactNode][] = [
    ["feed", "Descubre", <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M10.5 9.5l4 2.5-4 2.5z" fill="currentColor" /></svg>],
    ["list", "Carta", <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 6h14M5 12h14M5 18h9" /></svg>],
    ["tarjeta", "Tarjeta", <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="8" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" /><circle cx="16" cy="12" r="1.5" /></svg>],
    ["hoy", "Hoy", <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18" /></svg>],
    ["mesa", W(c).tab, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 10h16M6 10v9M18 10v9M8 6h8l2 4H6z" /></svg>],
  ];

  return (
    <div className="cv">
      {splash && (
        <div className="cv-splash">
          {c.intro_video && <video src={c.intro_video} poster={c.intro_poster} autoPlay muted loop playsInline />}
          <div className="cv-splash-in">
            {c.logo_url ? <img className="cv-logo-big" src={c.logo_url} alt={t.name} style={c.logo_width ? { width: c.logo_width } : undefined} /> : <div className="title-xl">{t.name}</div>}
            <div className="cv-mesa">{mesa ? `Bienvenidos a la mesa ${mesa}` : "Bienvenidos"}</div>
            <button className="cv-cta" onClick={() => { setSplash(false); try { sessionStorage.setItem(`cv:in:${slug}`, "1"); } catch { /* */ } }}>Ver la carta</button>
          </div>
        </div>
      )}

      <div className="cv-wrap">
        {page === "feed" && <Feed items={items} c={c} mesa={mesa} name={t.name} onAdd={add} onOpen={open} byName={byName} active={!splash} onBuild={openBuilder} />}
        {page === "list" && <List menu={menu} c={c} items={items} onAdd={add} onOpen={open} onBuild={openBuilder} />}
        {page === "hoy" && <Hoy c={c} name={t.name} onOpen={(n) => { const x = byName(n); if (x) open(x); }} />}
        {page === "tarjeta" && <Tarjeta slug={slug} c={c} />}
        {page === "mesa" && <Mesa slug={slug} c={c} mesa={mesa} items={allItems} order={order} setOrder={setOrder} setSheet={setSheet} />}
      </div>

      <nav className="cv-nav">
        {NAV.map(([k, l, ic]) => (
          <button key={k} className={`${page === k ? "on" : ""} ${k === "tarjeta" ? "hl" : ""}`} onClick={() => setPage(k)}>
            {ic}<span>{l}</span>{k === "mesa" && count > 0 && <span className="cv-cnt">{count}</span>}
          </button>
        ))}
      </nav>

      {sheet && <div className="cv-sheet" onClick={() => setSheet(null)}><div className="cv-sheet-in" onClick={(e) => e.stopPropagation()}>{sheet}</div></div>}
      <div className={`cv-toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}

function Badges({ x, c }: { x: Item; c: Config }) {
  const sp = x.sponsor ? c.sponsors?.[x.sponsor] : undefined;
  return (
    <div className="cv-badges">
      {x.star && <span className="w">{c.star_icon && <img src={c.star_icon} alt="" />}Recomendado</span>}
      {x.show && <span>Se flamea en tu mesa</span>}
      {sp && <span><img src={sp.icon} alt="" />{sp.label}</span>}
      {x.portion && <span>{portion(x.portion)}</span>}
    </div>
  );
}

function Feed({ items, c, mesa, name, onAdd, onOpen, byName, active, onBuild }: {
  items: Item[]; c: Config; mesa: string; name: string; onAdd: (id: string) => void; onOpen: (x: Item) => void;
  byName: (n: string) => Item | undefined; active: boolean; onBuild: () => void;
}) {
  const [cat, setCat] = useState("");
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  const feed = c.feed_categories ? items.filter((x) => c.feed_categories!.includes(x.cat)) : items.filter((x) => img(x) || x.star);
  const cats = [...new Set(feed.map((x) => x.cat))];
  const shown = feed.filter((x) => !cat || x.cat === cat);
  useEffect(() => { ref.current?.querySelectorAll("video").forEach((v) => { v.muted = true; v.play().catch(() => {}); }); }, [cat, active]);
  const pick = (k: string) => { setCat(k); ref.current?.scrollTo(0, 0); };

  return (
    <section className="cv-feed-page">
      <div className="cv-top">
        <div className="cv-row">{c.logo_url ? <img src={c.logo_url} alt={name} className="cv-logo-sm" /> : <b>{name}</b>}{mesa && <span className="cv-pill">Mesa {mesa}</span>}</div>
        <div className="cv-cats">
          <button className={!cat ? "on" : ""} onClick={() => pick("")}>Todo</button>
          {cats.map((k) => <button key={k} className={cat === k ? "on" : ""} onClick={() => pick(k)}>{k}</button>)}
        </div>
      </div>
      <div className="cv-feed" ref={ref}>
        {!cat && c.intro_video && (
          <div className="cv-slide">
            <video className="bg" src={c.intro_video} poster={c.intro_poster} autoPlay muted loop playsInline />
            <div className="cv-shade" />
            <div className="cv-info">
              <div className="cv-badges"><span className="w">{c.intro_tag || "La cocina"}</span></div>
              <h2>{c.intro_title}</h2><p>{c.intro_text}</p>
            </div>
            <div className="cv-hint">DESLIZA ↑</div>
          </div>
        )}
        {!cat && !c.intro_video && c.intro_image && (
          <div className="cv-slide cv-slide-art">
            <img className="cv-art-img" src={c.intro_image} alt="" />
            <div className="cv-shade" />
            <div className="cv-info">
              <div className="cv-badges"><span className="w">{c.intro_tag || name}</span></div>
              <h2>{c.intro_title}</h2><p>{c.intro_text}</p>
            </div>
            <div className="cv-hint">DESLIZA ↑</div>
          </div>
        )}
        {!cat && c.builder && (
          <div className="cv-slide cv-slide-art">
            <PizzaArt className="cv-art" seed="builder" base={baseFrom("")} tops={toppingsFrom("pepperoni champiñones maíz burrata")} />
            <div className="cv-shade" />
            <div className="cv-info">
              <div className="cv-badges"><span className="w">Interactivo</span></div>
              <h2>{c.builder.title}</h2><p>{c.builder.intro}</p>
              <button className="cv-btn" style={{ width: "auto", padding: "12px 22px" }} onClick={onBuild}>Armar la mía</button>
            </div>
          </div>
        )}
        {shown.map((x) => {
          const pr = c.pairings?.[x.name] ? byName(c.pairings[x.name]) : undefined;
          const im = img(x);
          const lk = liked.has(x.id);
          return (
            <div className="cv-slide" key={x.id}>
              {im ? <img className="bg" src={im} alt={x.name} loading="lazy" /> : c.art === "pizza" ? <div className="cv-slide-art"><PizzaArt className="cv-art" seed={x.name} base={baseFrom(x.description || "")} tops={toppingsFrom(`${x.name} ${x.description || ""}`)} /></div> : <div className="cv-noimg" />}
              <div className="cv-shade" />
              <div className="cv-info" onClick={() => onOpen(x)}>
                <Badges x={x} c={c} />
                <h2>{x.name}</h2>
                {x.description && <p>{x.description}</p>}
                <div className="cv-price">{price(x)}</div>
                {pr && <div className="cv-pair">Va perfecto con → <b>{pr.name}</b> · {cop(pr.price)}</div>}
              </div>
              <div className="cv-side">
                <button className="add" onClick={() => onAdd(x.id)}><span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg></span>Pedir</button>
                <button className={lk ? "liked" : ""} onClick={() => setLiked((s) => { const n = new Set(s); if (lk) n.delete(x.id); else n.add(x.id); return n; })}>
                  <span className="ic"><svg viewBox="0 0 24 24" fill={lk ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /></svg></span>Guardar</button>
                {pr && <button onClick={() => onOpen(pr)}><span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M7 7h10v10M7 17L17 7" /></svg></span>Maridaje</button>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function List({ menu, c, items, onAdd, onOpen, onBuild }: { menu: MenuT; c: Config; items: Item[]; onAdd: (id: string) => void; onOpen: (x: Item) => void; onBuild: () => void }) {
  const bcats = c.builder ? [c.builder.base, ...c.builder.groups] : [];
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  return (
    <section className="cv-page">
      <h1 className="cv-h1">La carta</h1>
      <div className="cv-sub">Toca un {W(c).item} para verlo y + para sumarlo {W(c).toOrder}.</div>
      <input className="cv-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={W(c).hint} />
      {c.builder && !s && (
        <div className="cv-build-cta" onClick={onBuild}>
          <PizzaArt className="th" seed="cta" base={baseFrom("")} tops={toppingsFrom("pepperoni champiñones maíz")} />
          <div><div className="t">Interactivo</div><b>{c.builder.title}</b><p>{c.builder.intro}</p></div>
          <span className="cv-plus">→</span>
        </div>
      )}
      {menu.categories.map((ca, ci) => {
        if (bcats.includes(ca.name)) return null;
        const its = items.filter((x) => x.catId === ca.id && (!s || `${x.name} ${x.description ?? ""}`.toLowerCase().includes(s)));
        if (!its.length) return null;
        const spk = c.category_sponsor?.[ca.name];
        const sp = spk ? c.sponsors?.[spk] : undefined;
        return (
          <div key={ca.id}>
            <div className="cv-lsec">{ca.name}</div>
            {sp ? <div className="cv-spon"><img src={sp.icon} alt={sp.label} /><div><div className="t">Patrocinador</div><p>{sp.note || sp.label}</p></div></div>
              : ca.note ? <div className="cv-lnote">{ca.note}</div> : null}
            {ci === 0 && c.star_note && c.star_icon && !s && <div className="cv-spon"><img src={c.star_icon} alt="" style={{ height: 34 }} /><div><div className="t">Recomendados</div><p>{c.star_note}</p></div></div>}
            {its.map((x) => {
              const im = img(x);
              const spi = x.sponsor ? c.sponsors?.[x.sponsor] : undefined;
              return (
                <div key={x.id} className="cv-litem" onClick={() => onOpen(x)}>
                  {im && <img className="th" src={im} alt="" loading="lazy" />}
                  <div className="tx">
                    <div className="n">{x.name}{x.star && c.star_icon && <img src={c.star_icon} alt="" />}{spi && <img src={spi.icon} alt="" />}</div>
                    {x.portion && <div className="g">{portion(x.portion)}</div>}
                    {x.description && <div className="d">{x.description}</div>}
                  </div>
                  <div className="p">{price(x)}</div>
                  <button className="cv-plus" onClick={(e) => { e.stopPropagation(); onAdd(x.id); }}>+</button>
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="cv-legal">{c.legal || c.menu_note}</div>
      <BySocial />
    </section>
  );
}

function Hoy({ c, name, onOpen }: { c: Config; name: string; onOpen: (dish: string) => void }) {
  return (
    <section className="cv-page">
      <h1 className="cv-h1">Hoy en {name}</h1>
      <div className="cv-sub">Lo que no te puedes perder</div>
      {(c.today || []).map((h, i) => (
        <div key={i} className="cv-card">
          {h.img && <img className="ph" src={h.img} alt="" />}
          {h.tag && <div className="k">{h.tag}</div>}
          <h3>{h.title}</h3>{h.text && <p>{h.text}</p>}
          {h.dish && <button className="cv-btn" onClick={() => onOpen(h.dish!)}>Ver el {W(c).item}</button>}
        </div>
      ))}
      {c.reservations_url && (
        <div className="cv-card"><div className="k">Reservas</div><h3>{c.reservations_label ? "Escríbenos" : "¿Vuelves con más gente?"}</h3><p>{c.reservations_label ? "Pedidos y preguntas por WhatsApp." : "Reserva por WhatsApp en un mensaje."}</p>
          <a className="cv-btn" href={c.reservations_url} target="_blank" rel="noreferrer">{c.reservations_label || "Reservar por WhatsApp"}</a></div>
      )}
      <div className="cv-card"><div className="k">Dónde estamos</div>
        <p>{c.address}{c.phone && <><br />Tel. {c.phone}</>}{c.instagram && <> · @{c.instagram.replace("@", "")}</>}</p>
        {c.instagram && <a className="cv-btn g" href={`https://instagram.com/${c.instagram.replace("@", "")}`} target="_blank" rel="noreferrer">Instagram</a>}
      </div>
      <BySocial />
    </section>
  );
}

function Tarjeta({ slug, c }: { slug: string; c: Config }) {
  const token = savedToken(slug);
  const [card, setCard] = useState<Card | null | undefined>(token ? undefined : null);
  useEffect(() => { if (token) rpc<Card | null>("get_card", { p_token: token }).then(setCard).catch(() => setCard(null)); }, [token]);
  const gifts = c.rewards.map((r) => r.visit);
  if (card === undefined) return <section className="cv-page"><div className="lbl pulse">Abriendo tu tarjeta</div></section>;
  if (!card) return (
    <section className="cv-page">
      <div className="lbl">{c.card_name}</div>
      <h1 className="cv-h1">Cada {U(c).s} suma</h1>
      <div className="cv-sub">{U(c).n(c.card_size)} por tarjeta, sin app y sin papel. Te registras una vez y queda en tu celular.</div>
      <div className="card">
        <div className="row-between"><div className="title-lg">{c.card_name}</div><div className="big-num">0/{c.card_size}</div></div>
        <Stamps stamps={0} size={c.card_size} rewards={gifts} />
      </div>
      <div className="block">
        <div className="lbl">Tus regalos</div>
        {c.rewards.map((r) => <div key={r.visit} className="li"><div className="n">{r.visit}</div><div className="grow"><b>{r.title}</b><small>{r.desc}</small></div></div>)}
      </div>
      {extras(c).length > 0 && <div className="cv-card" style={{ marginTop: 16 }}><div className="k">Sellos extra</div>
        {extras(c).map((x) => <p key={x.t}><b>{x.t}:</b> {x.d}</p>)}</div>}
      <Link className="cv-btn" to={`/${slug}/tarjeta`}>Crear mi tarjeta</Link>
      <Link className="cv-btn g" to={`/${slug}/tarjeta?ya=1`}>Ya tengo tarjeta</Link>
      <BySocial />
    </section>
  );
  const next = card.rewards.find((r) => r.visit > card.stamps);
  const ready = card.rewards.filter((r) => r.status === "listo").length + card.pending_rewards.length;
  const f = next ? next.visit - card.stamps : 0;
  return (
    <section className="cv-page">
      <div className="row-between"><div className="lbl">Hola, {card.name.split(" ")[0]}</div><div className="lbl">Nivel {card.level.tier?.name}</div></div>
      <div className="card">
        <div className="row-between"><div className="title-lg">{c.card_name}</div><div className="big-num">{card.stamps}/{card.card_size}</div></div>
        <Stamps stamps={card.stamps} size={card.card_size} rewards={gifts} />
        <div className="lbl tiny">{next ? `${U(c).falta(f)} para: ${next.title}` : "Tarjeta completa. Canjea tu regalo."}</div>
      </div>
      {ready > 0 && <div className="msg">Tienes {ready} {plural(ready, "regalo listo", "regalos listos")} para canjear.</div>}
      <Link className="cv-btn" to={`/${slug}/t/${token}`}>Ver mi tarjeta y mostrar mi código</Link>
      <BySocial />
    </section>
  );
}

function Mesa({ slug, c, mesa, items, order, setOrder, setSheet }: {
  slug: string; c: Config; mesa: string; items: Item[]; order: Record<string, number>;
  setOrder: React.Dispatch<React.SetStateAction<Record<string, number>>>; setSheet: (n: React.ReactNode) => void;
}) {
  const ids = Object.keys(order).filter((k) => order[k] > 0 && items.some((x) => x.id === k));
  const it = (k: string) => items.find((x) => x.id === k)!;
  const total = ids.reduce((s, k) => s + (it(k).price || 0) * order[k], 0);
  const [stars, setStars] = useState(0);
  const [fb, setFb] = useState("");
  const [sent, setSent] = useState(false);
  const big = (title: string) => setSheet(<>
    <div className="cv-waiter-k">{mesa ? `Mesa ${mesa}` : W(c).tienda ? "Para la caja" : "Para el mesero"}</div>
    <div className="cv-waiter">{title}</div>
    <p className="muted small center" style={{ marginTop: 10 }}>Muéstrale esta pantalla al mesero o levanta el celular.</p>
    <button className="cv-btn" onClick={() => setSheet(null)}>Cerrar</button></>);
  return (
    <section className="cv-page">
      <h1 className="cv-h1">{W(c).title}</h1>
      <div className="cv-sub">Arma tu pedido y muéstraselo {W(c).staff}.</div>
      <div className="cv-card">
        {!ids.length ? <p>Todavía no has elegido nada. Desliza en Descubre o abre la Carta y toca +.</p> : <>
          {ids.map((k) => (
            <div key={k} className="cv-oi"><div><div className="nm">{it(k).name}</div><div className="muted small">{cop(it(k).price)}</div></div>
              <div className="cv-qty"><button onClick={() => setOrder((o) => ({ ...o, [k]: o[k] - 1 }))}>−</button><b>{order[k]}</b><button onClick={() => setOrder((o) => ({ ...o, [k]: o[k] + 1 }))}>+</button></div></div>
          ))}
          <div className="cv-total"><span>Total</span><span>{cop(total)}</span></div>
          <div className="muted small">Precios sin impuesto al consumo. Servicio voluntario no incluido.</div>
          <button className="cv-btn" onClick={() => setSheet(<>
            <div className="cv-waiter-k">Pedido{mesa ? ` · mesa ${mesa}` : ""}</div>
            {ids.map((k) => <div key={k} className="cv-waiter" style={{ margin: "12px 0" }}>{order[k]} × {it(k).name}</div>)}
            <button className="cv-btn" onClick={() => setSheet(null)}>Cerrar</button></>)}>Mostrar {W(c).staff}</button>
          <button className="cv-btn g" onClick={() => setOrder({})}>Vaciar</button>
        </>}
      </div>
      {!W(c).tienda && <div className="cv-card">
        <button className="cv-btn g" onClick={() => big("Necesito al mesero")}>Llamar al mesero</button>
        <button className="cv-btn g" onClick={() => big("La cuenta, por favor")}>Pedir la cuenta</button>
      </div>}
      <div className="cv-card">
        <div className="k">Al terminar</div><h3>¿Cómo estuvo todo?</h3>
        <div className="cv-stars">{[1, 2, 3, 4, 5].map((i) => <button key={i} className={i <= stars ? "on" : ""} onClick={() => { setStars(i); setSent(false); }}>★</button>)}</div>
        {stars >= 4 && <>
          <p className="center">¡Gracias! ¿Nos ayudas contándolo en Google?</p>
          {c.google_review_url && <a className="cv-btn" href={c.google_review_url} target="_blank" rel="noreferrer"
            onClick={() => { rpc("send_feedback", { p_slug: slug, p_stars: stars, p_comment: null, p_table: mesa, p_token: savedToken(slug) }).catch(() => {}); }}>Dejar reseña en Google</a>}
        </>}
        {stars > 0 && stars < 4 && (sent ? <p className="center">Recibido. Le llegó directo al gerente.</p> : <>
          <p>Gracias por decírnoslo. Esto le llega directo al gerente y no se publica.</p>
          <textarea className="ta" value={fb} onChange={(e) => setFb(e.target.value)} placeholder="¿Qué pasó?" />
          <button className="cv-btn" onClick={async () => { await rpc("send_feedback", { p_slug: slug, p_stars: stars, p_comment: fb, p_table: mesa, p_token: savedToken(slug) }).catch(() => {}); setSent(true); }}>Enviar al gerente</button>
        </>)}
      </div>
      <BySocial />
    </section>
  );
}

function DishSheet({ x, c, pair, onAdd, onClose }: { x: Item; c: Config; pair?: Item; onAdd: () => void; onClose: () => void }) {
  const ph = x.photos?.length ? x.photos : img(x) ? [img(x)!] : [];
  return (<>
    {ph.length > 0 && <div className="cv-gal">{ph.map((p) => <img key={p} src={p} alt={x.name} />)}</div>}
    <Badges x={x} c={c} />
    <div className="cv-waiter" style={{ textAlign: "left", fontSize: 34 }}>{x.name}</div>
    {x.description && <p className="cv-desc">{x.description}</p>}
    <div className="cv-price">{price(x)}</div>
    {pair && <div className="cv-pair">Va perfecto con → <b>{pair.name}</b> · {cop(pair.price)}</div>}
    <button className="cv-btn" onClick={onAdd}>{W(c).addBtn}</button>
    <button className="cv-btn g" onClick={onClose}>Cerrar</button>
  </>);
}

function Builder({ menu, c, onAdd, onClose }: { menu: MenuT; c: Config; onAdd: (name: string, price: number) => void; onClose: () => void }) {
  const b = c.builder!;
  const bases = menu.categories.find((x) => x.name === b.base)?.dishes || [];
  const groups = b.groups.map((g) => ({ name: g, dishes: menu.categories.find((x) => x.name === g)?.dishes || [] })).filter((g) => g.dishes.length);
  const [base, setBase] = useState(bases[0]?.id || "");
  const [sel, setSel] = useState<Record<string, number>>({});
  const all = groups.flatMap((g) => g.dishes);
  const bd = bases.find((x) => x.id === base);
  const chosen = all.filter((d) => sel[d.id]);
  const total = (bd?.price || 0) + chosen.reduce((s, d) => s + (d.price || 0) * sel[d.id], 0);
  const label = (n: string) => n.replace(/^Toppings\s*/i, "").replace(/^·\s*/, "");
  const name = `Pizza armada: ${bd?.name ?? ""}${chosen.length ? " + " + chosen.map((d) => (sel[d.id] > 1 ? `${d.name} ×${sel[d.id]}` : d.name)).join(", ") : ""}`;
  return (<>
    <div className="cv-builder-art"><PizzaArt seed={`b-${chosen.map((d) => d.id).join()}`} base={baseFrom(bd?.name || "")} cheese={!!bd && !/nutella|arequipe|chocolate/i.test(bd.name)} tops={toppingsFrom(chosen.map((d) => d.name).join(" "))} /></div>
    <div className="cv-waiter" style={{ textAlign: "left", fontSize: 30 }}>{b.title}</div>
    <div className="lbl" style={{ marginTop: 14 }}>1 · Escoge la base</div>
    <div className="cv-chips">{bases.map((x) => <button key={x.id} className={base === x.id ? "on" : ""} onClick={() => setBase(x.id)}>{x.name} · {cop(x.price)}</button>)}</div>
    {groups.map((g, gi) => (
      <div key={g.name}>
        <div className="lbl" style={{ marginTop: 14 }}>{gi + 2} · {label(g.name)}</div>
        <div className="cv-chips">{g.dishes.map((x) => {
          const n = sel[x.id] || 0;
          return <button key={x.id} className={n ? "on" : ""} onClick={() => setSel((s) => ({ ...s, [x.id]: n >= 2 ? 0 : n + 1 }))}>{x.name}{n > 1 ? " ×2" : ""} · +{cop(x.price)}</button>;
        })}</div>
      </div>
    ))}
    <p className="muted small" style={{ marginTop: 10 }}>Toca un ingrediente para sumarlo; dos veces, doble porción; tres veces, lo quitas.</p>
    <div className="cv-total"><span>Total</span><span>{cop(total)}</span></div>
    <button className="cv-btn" disabled={!bd} onClick={() => onAdd(name, total)}>{W(c).addBtn}</button>
    <button className="cv-btn g" onClick={onClose}>Cerrar</button>
  </>);
}
