import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const proxy = { "/rest/v1": { target: "http://localhost:3009", rewrite: (p: string) => p.replace(/^\/rest\/v1/, ""),
  configure: (px: any) => px.on("proxyReq", (r: any) => r.removeHeader("authorization")) } };
export default defineConfig({ plugins: [react()], server: { port: 5180, proxy }, preview: { port: 5180, proxy } });
