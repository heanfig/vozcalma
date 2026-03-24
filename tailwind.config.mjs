/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4f17ce",
        tertiary: "#2b5140",
        surface: "#faf9fb",
        "on-surface": "#1b1c1e",
        "surface-container-low": "#f5f3f5",
        "surface-container-high": "#e9e8ea",
        "surface-container-highest": "#e3e2e4",
        "primary-fixed": "#e7deff",
        "outline-variant": "#cac3d8",
        "primary-fixed": "#e7deff",
        "primary-container": "#673de6",
        "on-primary-container": "#e1d7ff",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
      },
      fontFamily: {
        headline: ["Noto Serif", "serif"],
        body: ["Plus Jakarta Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
