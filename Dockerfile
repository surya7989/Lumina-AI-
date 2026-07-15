# ---- Build Frontend ----
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# ---- Build Proxy Server ----
FROM node:20-alpine

WORKDIR /app/server

COPY server/package*.json ./
RUN npm install --omit=dev

COPY server/ .
COPY --from=frontend-builder /app/client/dist /app/client/dist

ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "server.js"]
