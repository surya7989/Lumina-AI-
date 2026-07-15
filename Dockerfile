# ---- Build Frontend ----
FROM node:20-alpine AS frontend-builder

# Allow build-time variables to be passed for Vite (VITE_*) so the client build can embed them
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_AI_PROXY_URL

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
# Pass build args into environment so `npm run build` (vite) can read import.meta.env.VITE_*
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_AI_PROXY_URL=$VITE_AI_PROXY_URL

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
