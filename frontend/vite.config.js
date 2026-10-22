import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The app calls the same-origin /api; in development forward it to Spring Boot.
    proxy: {
      "/api": "http://localhost:8081",
    },
  },
  preview: {
    proxy: {
      "/api": "http://localhost:8081",
    },
  },
});
