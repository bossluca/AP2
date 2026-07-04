# Mehrstufiges Frontend-Image:
#  1) Build der statischen App mit Node/Vite
#  2) Auslieferung über Nginx (statische Dateien + SPA-Fallback + /api-Proxy).
#     SSL/HTTPS übernimmt der vorgelagerte Nginx Proxy Manager.

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
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
