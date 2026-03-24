// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import clerk from "@clerk/astro";
import { esES } from "@clerk/localizations";

// https://astro.build/config
export default defineConfig({
  site: "https://vozcalma.app",
  integrations: [
    clerk({
      localization: esES,
    }),
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  adapter: node({ mode: "standalone" }),
  output: "server",
});
