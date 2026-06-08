import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174, // 5173 is the statik-frontend default; avoid clashing
    host: true,
  },
});
