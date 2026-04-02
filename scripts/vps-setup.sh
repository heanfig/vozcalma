#!/bin/bash
# =============================================================
# VozCalma VPS Setup — Ejecutar UNA SOLA VEZ en el servidor
# ssh root@72.62.105.169 < scripts/vps-setup.sh
# =============================================================
set -euo pipefail

echo "==> Instalando Docker..."
dnf install -y dnf-plugins-core
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker

echo "==> Creando directorio del proyecto..."
mkdir -p /opt/vozcalma
cd /opt/vozcalma

echo "==> Creando Caddyfile..."
cat > Caddyfile << 'CADDY'
vozcalma.app {
	reverse_proxy vozcalma:8080
}

www.vozcalma.app {
	redir https://vozcalma.app{uri} permanent
}
CADDY

echo "==> Creando docker-compose.yml..."
cat > docker-compose.yml << 'COMPOSE'
services:
  vozcalma:
    image: ghcr.io/heanfig/vozcalma:latest
    restart: unless-stopped
    env_file: .env
    environment:
      - HOST=0.0.0.0
      - PORT=8080
    networks:
      - web

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - web

volumes:
  caddy_data:
  caddy_config:

networks:
  web:
COMPOSE

echo "==> Login a GitHub Container Registry..."
echo "IMPORTANTE: Necesitas crear un Personal Access Token en GitHub con permiso 'read:packages'"
echo "Luego ejecuta: echo TOKEN | docker login ghcr.io -u heanfig --password-stdin"

echo ""
echo "==> Setup completo. Pasos siguientes:"
echo "1. Crea el archivo .env en /opt/vozcalma/.env con las variables de entorno"
echo "2. Haz login a ghcr.io (ver arriba)"
echo "3. docker compose pull && docker compose up -d"
echo ""
echo "Listo!"
