import type { Config } from "./api";

const loaded = new Set(["Cormorant Garamond", "Montserrat", "DM Sans"]);

function loadFont(name: string) {
  if (!name || loaded.has(name)) return;
  loaded.add(name);
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(l);
}

export function applyTheme(c?: Partial<Config> | null) {
  const r = document.documentElement.style;
  const col = c?.colors ?? { bg: "#000000", fg: "#FFFFFF", muted: "#8A8A8A", line: "#2A2A2A", accent: "#FFFFFF" };
  const f = c?.fonts ?? { title: "Cormorant Garamond", body: "Montserrat" };
  r.setProperty("--bg", col.bg);
  r.setProperty("--fg", col.fg);
  r.setProperty("--muted", col.muted);
  r.setProperty("--line", col.line);
  r.setProperty("--accent", col.accent || col.fg);
  r.setProperty("--title", `"${f.title}", Georgia, serif`);
  r.setProperty("--body", `"${f.body}", system-ui, sans-serif`);
  loadFont(f.title);
  loadFont(f.body);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", col.bg);
}

export function socialTheme() {
  applyTheme({
    colors: { bg: "#000000", fg: "#FFFFFF", muted: "#8A8A8A", line: "#2A2A2A", accent: "#F5C518" },
    fonts: { title: "Cormorant Garamond", body: "DM Sans" },
  });
}
