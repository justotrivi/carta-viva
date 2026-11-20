import { useEffect } from "react";
import { Link } from "react-router-dom";
import { socialTheme } from "../lib/theme";

export default function Home() {
  useEffect(() => { socialTheme(); document.title = "Carta Viva · by SOCIAL"; }, []);
  return (
    <div className="page narrow home">
      <div className="social-mark">#SOCIAL</div>
      <div className="lbl">Carta Viva</div>
      <h1 className="title-xxl">La carta que trae de vuelta a tus clientes</h1>
      <p className="muted">Carta QR, tarjeta de sellos digital y panel para el dueño. Hecha en Cartagena por SOCIAL.</p>
      <Link className="btn" to="/panel">Entrar al panel</Link>
    </div>
  );
}
