# VozCalma — Astro SSR con @astrojs/node (modo standalone)
# Build multi-stage: imagen final solo con artefactos de producción.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

# Solo dependencias de producción (el servidor Astro resuelve imports desde node_modules)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["node", "./dist/server/entry.mjs"]
