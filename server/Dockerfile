# Backend-Image: Fastify + node:sqlite (keine native Build-Abhängigkeit).
FROM node:24-alpine

WORKDIR /app

# Nur Manifest zuerst -> Layer-Caching für npm ci.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# SQLite-Datei liegt auf einem Volume (siehe docker-compose).
ENV NODE_ENV=production
ENV DB_PATH=/app/data/lernapp.sqlite
EXPOSE 3001

CMD ["node", "src/index.js"]
