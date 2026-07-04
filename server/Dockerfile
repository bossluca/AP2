# Backend-Image: Fastify + node:sqlite (keine native Build-Abhängigkeit).
FROM node:24-alpine

WORKDIR /app

# Nur Manifest zuerst -> Layer-Caching für npm ci.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# SQLite-Datei liegt auf einem Volume (siehe docker-compose). Das Datenverzeichnis
# gehört dem unprivilegierten node-User (Docker übernimmt die Ownership beim
# ersten Befüllen eines benannten Volumes vom Image-Verzeichnis).
RUN mkdir -p /app/data && chown -R node:node /app

ENV NODE_ENV=production
ENV DB_PATH=/app/data/lernapp.sqlite
EXPOSE 3001

# Härtung: nicht als root laufen (Least Privilege).
USER node

CMD ["node", "src/index.js"]
