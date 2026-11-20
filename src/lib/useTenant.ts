import { useEffect, useState } from "react";
import { rpc, type Menu } from "./api";
import { applyTheme } from "./theme";

const cache = new Map<string, Menu>();

export function useMenu(slug: string | undefined) {
  const [menu, setMenu] = useState<Menu | null>(slug ? cache.get(slug) ?? null : null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">(menu ? "ok" : "loading");

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    rpc<Menu | null>("get_menu", { p_slug: slug })
      .then((m) => {
        if (!alive) return;
        if (!m) return setState("missing");
        cache.set(slug, m);
        setMenu(m);
        applyTheme(m.tenant.config);
        document.title = `${m.tenant.name} · Carta`;
        setState("ok");
      })
      .catch(() => alive && setState(cache.has(slug) ? "ok" : "error"));
    if (cache.has(slug)) applyTheme(cache.get(slug)!.tenant.config);
    return () => { alive = false; };
  }, [slug]);

  return { menu, state };
}
