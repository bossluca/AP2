# Mehrstufiges Frontend-Image:
#  1) Build der statischen App mit Node/Vite
#  2) Auslieferung über Caddy (statische Dateien + Reverse-Proxy auf /api,
#     automatisches HTTPS in Produktion)

# --- Stage 1: Build ---------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# base bleibt "/" (Root-Domain); für Subpfad VITE_BASE als build-arg setzen.
ARG VITE_BASE=/
ENV VITE_BASE=${VITE_BASE}
RUN npm run build

# --- Stage 2: Serve ---------------------------------------------------------
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443
