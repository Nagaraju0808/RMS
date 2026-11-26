# DineFlow production image.  Build: docker build -t dineflow .   Run: see DEPLOYMENT.md
# ---- 1. install dependencies ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. build ----
FROM deps AS build
WORKDIR /app
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev && npm install --no-save tsx prisma@6.19.3

# ---- 3. run ----
FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 APP_TZ=Asia/Kolkata TZ=Asia/Kolkata NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates postgresql-client && rm -rf /var/lib/apt/lists/* \
  && groupadd -r dineflow && useradd -r -g dineflow -d /app dineflow
COPY --from=build --chown=dineflow:dineflow /app/node_modules ./node_modules
COPY --from=build --chown=dineflow:dineflow /app/.next ./.next
COPY --from=build --chown=dineflow:dineflow /app/public ./public
COPY --from=build --chown=dineflow:dineflow /app/prisma ./prisma
COPY --from=build --chown=dineflow:dineflow /app/src ./src
COPY --from=build --chown=dineflow:dineflow /app/server.ts /app/package.json /app/next.config.mjs /app/tsconfig.json ./
COPY --chown=dineflow:dineflow scripts ./scripts
RUN mkdir -p public/uploads backups && chown -R dineflow:dineflow public/uploads backups
USER dineflow
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Apply schema changes, then start the server (Next.js + Socket.IO).
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx server.ts"]
