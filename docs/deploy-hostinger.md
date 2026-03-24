# Despliegue en VPS (Hostinger u otro) — VozCalma

La app es **Node.js** (Astro SSR, adaptador `@astrojs/node` en modo **standalone**). El proceso escucha en `HOST` (por defecto `0.0.0.0`) y `PORT` (por defecto **8080** en el adaptador si no defines `PORT`).

## Docker

1. Copiar `.env.example` a `.env` en el servidor y rellenar variables (Clerk, Supabase, OpenRouter, ElevenLabs, `ADMIN_API_SECRET`, etc.).
2. Copiar `docker-compose.example.yml` a `docker-compose.yml` y ajustar si hace falta.
3. `docker compose up -d --build`.

El contenedor publica **solo en localhost:8080** del VPS (`127.0.0.1:8080`) para que **Nginx** (o Caddy) haga TLS y proxy hacia el backend.

## Nginx (TLS + proxy)

Ejemplo de bloque `server` (sustituir rutas de certificados; dominio `vozcalma.app`):

```nginx
server {
    listen 443 ssl http2;
    server_name vozcalma.app www.vozcalma.app;

    ssl_certificate     /etc/letsencrypt/live/vozcalma.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vozcalma.app/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name vozcalma.app www.vozcalma.app;
    return 301 https://$host$request_uri;
}
```

**Timeouts:** las respuestas de TTS o LLM pueden tardar; si ves `504`, sube `proxy_read_timeout` (p. ej. `300s`) en el `location /`.

## Certificados (Let’s Encrypt)

En Ubuntu/Debian suele usarse **Certbot** con el plugin Nginx: `sudo certbot --nginx -d vozcalma.app -d www.vozcalma.app`.

## Clerk

En el dashboard de Clerk, añade URLs de producción: `https://vozcalma.app` y rutas de callback/sign-in según la documentación de Clerk para Astro.

## Supabase

Ejecuta las migraciones SQL del repo y crea el bucket de Storage **`meditation-audio`** si usas el endpoint admin con subida de audio.
