import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Tenant } from "../lib/api";

export function Logo({ tenant, size = "md", to }: { tenant: Tenant; size?: "sm" | "md" | "lg"; to?: string }) {
  const c = tenant.config;
  const inner = c.logo_url ? (
    <img src={c.logo_url} alt={tenant.name} className={`logo-img ${size}`} />
  ) : (
    <div className={`logo ${size}`}>
      {c.logo_top && <div className="logo-small">{c.logo_top}</div>}
      <div className="logo-main">{renderLogoText(c.logo_text || tenant.name.toUpperCase())}</div>
      {c.logo_bottom && <div className="logo-small">{c.logo_bottom}</div>}
    </div>
  );
  return to ? <Link to={to} className="logo-link">{inner}</Link> : inner;
}

// "LA ÚNICA": la A de "LA" va pequeña y subrayada
function renderLogoText(t: string) {
  if (t === "LA ÚNICA") return (<>L<span className="logo-a">A</span> ÚNICA</>);
  return t;
}

export function BySocial() {
  return (
    <div className="by-social">
      Carta Viva · by <b>SOCIAL</b>
    </div>
  );
}

export function Loading({ text = "Cargando" }: { text?: string }) {
  return <div className="center-screen"><div className="lbl pulse">{text}</div></div>;
}

export function Missing({ text }: { text: string }) {
  return (
    <div className="center-screen">
      <div style={{ textAlign: "center", padding: 24 }}>
        <div className="title-lg">{text}</div>
        <p className="muted" style={{ marginTop: 10 }}>Revisa el enlace o escanea de nuevo el QR.</p>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-in" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function Stamps({ stamps, size, rewards }: { stamps: number; size: number; rewards: number[] }) {
  return (
    <div className="stamps" style={{ gridTemplateColumns: `repeat(${Math.min(5, size)}, 1fr)` }}>
      {Array.from({ length: size }, (_, i) => i + 1).map((i) => {
        const full = i <= stamps;
        return (
          <div key={i} className={`stamp ${full ? "full" : ""} ${rewards.includes(i) ? "gift" : ""}`}>
            {full ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg>
            ) : i}
          </div>
        );
      })}
    </div>
  );
}
