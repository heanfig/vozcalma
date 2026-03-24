// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import clerk from "@clerk/astro";

// https://astro.build/config
export default defineConfig({
  site: "https://vozcalma.app",
  integrations: [
    clerk(),
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  adapter: node({ mode: "standalone" }),
  output: "server",
});
