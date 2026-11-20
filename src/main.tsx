import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./styles.css";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Join from "./pages/Join";
import CardPage from "./pages/CardPage";
const Staff = lazy(() => import("./pages/Staff"));
const Panel = lazy(() => import("./pages/Panel"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/panel" element={<Panel />} />
        <Route path="/:slug" element={<Menu />} />
        <Route path="/:slug/tarjeta" element={<Join />} />
        <Route path="/:slug/t/:token" element={<CardPage />} />
        <Route path="/:slug/mesero" element={<Staff />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>
);
