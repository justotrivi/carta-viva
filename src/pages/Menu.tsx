import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { savedToken, type Dish } from "../lib/api";
import { cop } from "../lib/format";
import { useMenu } from "../lib/useTenant";
import { BySocial, Loading, Logo, Missing } from "../components/ui";

export default function Menu() {
  const { slug = "" } = useParams();
  const { menu, state } = useMenu(slug);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string>("");
  const navRef = useRef<HTMLDivElement>(null);

  const cats = useMemo(() => {
    if (!menu) return [];
    const s = q.trim().toLowerCase();
    if (!s) return menu.categories;
    return menu.categories
      .map((c) => ({ ...c, dishes: c.dishes.filter((d) => `${d.name} ${d.description ?? ""}`.toLowerCase().includes(s)) }))
      .filter((c) => c.dishes.length);
  }, [menu, q]);

  // Categoría activa al hacer scroll
  useEffect(() => {
    if (!cats.length) return;
    const obs = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-120px 0px -70% 0px" }
    );
    cats.forEach((c) => { const el = document.getElementById(c.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [cats]);

  useEffect(() => {
    const b = navRef.current?.querySelector(`[data-id="${active}"]`) as HTMLElement | null;
    b?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  if (state === "loading" && !menu) return <Loading />;
  if (state === "missing") return <Missing text="Esta carta no existe" />;
  if (!menu) return <Missing text="Sin conexión" />;

  const t = menu.tenant;
  const c = t.config;
  const token = savedToken(slug);

  return (
    <div className="page menu-page">
      <header className="menu-head">
        <Logo tenant={t} size="md" />
      </header>

      <div className="sticky-bar">
        <div className="cat-nav" ref={navRef}>
          {cats.map((ca) => (
            <button key={ca.id} data-id={ca.id} className={active === ca.id ? "on" : ""}
              onClick={() => document.getElementById(ca.id)?.scrollIntoView({ behavior: "smooth" })}>
              {ca.name}
            </button>
          ))}
        </div>
        <div className="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la carta" aria-label="Buscar en la carta" />
          {q && <button className="link" onClick={() => setQ("")}>Borrar</button>}
        </div>
      </div>

      <main className="wrap">
        {!cats.length && <p className="muted center pad">No encontramos “{q}”.</p>}
        {cats.map((ca) => (
          <section key={ca.id} id={ca.id} className="cat">
            <div className="cat-title">
              <h2 className="title-lg">{ca.name}</h2>
              {ca.note && <div className="lbl">{ca.note}</div>}
            </div>
            <div className="feed">
              {ca.dishes.map((d) => <DishCard key={d.id} d={d} />)}
            </div>
          </section>
        ))}

        <footer className="menu-foot">
          {c.menu_note && <p>{c.menu_note}</p>}
          {c.address && <p>{c.address}</p>}
          {c.instagram && (
            <p><a href={`https://instagram.com/${c.instagram.replace("@", "")}`} target="_blank" rel="noreferrer">@{c.instagram.replace("@", "")}</a></p>
          )}
          <BySocial />
        </footer>
      </main>

      <div className="dock">
        <Link className="btn" to={token ? `/${slug}/t/${token}` : `/${slug}/tarjeta`}>{c.card_name}</Link>
        {c.reservations_url ? (
          <a className="btn ghost" href={c.reservations_url} target="_blank" rel="noreferrer">Reservar</a>
        ) : null}
      </div>
    </div>
  );
}

function DishCard({ d }: { d: Dish }) {
  const opts = d.price2 && d.portion?.includes("/") ? d.portion.split("/").map((s) => s.trim()) : null;
  return (
    <article className="dish">
      {d.media_url ? (
        d.media_type === "video" ? (
          <video className="dish-media" src={d.media_url} autoPlay muted loop playsInline preload="metadata" />
        ) : (
          <img className="dish-media" src={d.media_url} alt={d.name} loading="lazy" />
        )
      ) : null}
      <div className="dish-body">
        {(d.star || d.show) && (
          <div className="tags">
            {d.star && <span className="tag inv">Favorito de la casa</span>}
            {d.show && <span className="tag">Show en mesa</span>}
          </div>
        )}
        <div className="dish-row">
          <h3 className="dish-name">{d.name}</h3>
          {!opts && <div className="dish-price">{cop(d.price)}{d.price2 ? ` / ${cop(d.price2)}` : ""}</div>}
        </div>
        {d.portion && !opts && <div className="lbl">{/^\d+$/.test(d.portion) ? `${d.portion} ${d.portion === "1" ? "unidad" : "unidades"}` : d.portion}</div>}
        {opts && (
          <div className="opts">
            <span>{opts[0]} <b>{cop(d.price)}</b></span>
            <span>{opts[1]} <b>{cop(d.price2)}</b></span>
          </div>
        )}
        {d.description && <p className="dish-desc">{d.description}</p>}
      </div>
    </article>
  );
}
