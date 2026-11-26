# Putting DineFlow online – step by step

DineFlow is one Node.js server (website + live updates) and one PostgreSQL database.
It needs a normal server or VPS (for example a 2 GB / 2 CPU machine), **not** serverless hosting,
because the kitchen screen uses a live connection (Socket.IO).

## Option A – Docker (easiest)

1. **Get a server** with Docker installed (Ubuntu 24.04: `curl -fsSL https://get.docker.com | sh`).
2. **Copy the code** to the server: `git clone <your repo> dineflow && cd dineflow`
3. **Create secrets** – make a file called `.env` next to `docker-compose.yml`:
   ```
   POSTGRES_PASSWORD=<a long random password>
   JWT_SECRET=<output of: openssl rand -hex 32>
   PUBLIC_URL=https://your-domain.com
   ```
   (Other settings: see ENVIRONMENT.md.)
4. **Start everything**: `docker compose --profile app up -d --build`
   The app creates its tables on first start. Open `http://SERVER-IP:3000` and sign up your restaurant.
5. **Optional demo data** (only on a test server – it creates the "demo" restaurant):
   `docker compose exec app npx tsx prisma/seed.ts`
6. **Add HTTPS** (needed for the phone app, voice ordering and payments). Simplest is Caddy in front:
   install Caddy, then in `/etc/caddy/Caddyfile`:
   ```
   your-domain.com {
       reverse_proxy localhost:3000
   }
   ```
   `sudo systemctl reload caddy` – Caddy gets the certificate by itself. WebSockets work through it.

## Option B – without Docker

1. Install Node.js 22 and PostgreSQL 16. Create a database and user.
2. `cp .env.example .env` and fill in `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_URL`.
3. `npm ci && npx prisma db push && npm run build`
4. Start: `npm start` (keep it running with `pm2 start npm --name dineflow -- start` or a systemd service).
5. Put Caddy or Nginx in front for HTTPS (with WebSocket upgrade enabled for `/socket.io`).

## Backups (do this on day one)
- Daily backup at 3 AM, kept 14 days:
  `crontab -e` → `0 3 * * * cd /srv/dineflow && DATABASE_URL=postgresql://... ./scripts/backup.sh >> backups/backup.log 2>&1`
  With Docker: `docker compose exec -T db pg_dump -U postgres dineflow | gzip > backups/dineflow-$(date +%F).sql.gz`
- **Copy backups off the server** (another machine, Google Drive, S3). A backup on the same disk is lost with the disk.
- **Test a restore** once a month into an empty database: `DATABASE_URL=.../dineflow_test ./scripts/restore.sh backups/<file>.sql.gz`
- Also back up the uploaded photos folder `public/uploads` (Docker volume `uploads`).

## Updating to a new version
`git pull && docker compose --profile app up -d --build` (back up first). Database changes are applied on start.

## Health and logs
- Health check: `https://your-domain.com/api/health` → `{"ok":true}` when the app and database are fine.
- Logs: `docker compose logs -f app`

## Before going live – checklist
- [ ] `JWT_SECRET` and database password are long and random, and not in git.
- [ ] HTTPS works; `PUBLIC_URL` uses https; table QR codes printed after setting it.
- [ ] Daily backups run and a restore was tested.
- [ ] `DEMO_LOGIN` is not set (or `0`). Demo restaurant not loaded on the live server.
- [ ] Payments: still `mock` or Razorpay **test** keys until you are ready (see TODO.md for going live).
- [ ] Each staff member has their own login and PIN; the owner password is strong.
