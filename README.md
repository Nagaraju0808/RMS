# DineFlow – Restaurant Management App

Works for fine dining, quick service, cafés, cloud kitchens, bars, food trucks and chains.

## Run it on your computer (simple steps)
1. Install **Node.js 20+** and **PostgreSQL 16** (or Docker).
2. Start the database:
   - with Docker: `docker compose up -d db`
   - or Linux: `sudo service postgresql start` (user `postgres`, password `postgres`, database `dineflow`)
3. Copy settings: `cp .env.example .env`
4. Install: `npm install`
5. Create the tables: `npx prisma db push`
6. Add demo data: `npm run db:seed`
7. Start: `npm run dev` and open **http://localhost:3000**

## Demo logins
| Role | Email | PIN |
|---|---|---|
| Owner | owner@demo.com | 1111 |
| Manager | manager@demo.com | 2222 |
| Cashier | cashier@demo.com | 3333 |
| Waiter | waiter@demo.com | 4444 |
| Chef | chef@demo.com | 5555 |
| Delivery | rider@demo.com | 6666 |

Password for all: `password123`. For PIN login, restaurant code is `demo`.

## Going live
See **DEPLOYMENT.md** (step by step), **ENVIRONMENT.md** (settings), **SECURITY.md** and **PERFORMANCE.md**.
The app works offline on POS and kitchen tablets (orders are saved on the device and sent when the internet returns).

## Tests
- `npm test` – unit tests (bill maths, tax, stock, …)
- `npm run test:integration` – database tests (uses the `dineflow_test` database)
- `npm run test:e2e` – browser tests (starts the app automatically)
- `npm run audit:routes` – checks every API route requires a login
