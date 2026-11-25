# Decisions made while building (no one was available to ask)

1. **Branch name**: work is on `build-all-phases` as requested.
2. **Versions**: Next.js 15.5, React 19.1, Prisma 6.19, Tailwind 4, TypeScript 5.9. (Newer majors
   – Next 16, Prisma 8 RC, TypeScript 7 – exist but TS 7 broke `next.config.ts`, so stable versions were pinned.)
   `next.config.mjs` is used instead of `next.config.ts` for the same reason.
3. **shadcn/ui**: the shadcn CLI is interactive, so a small set of shadcn-style components was written
   by hand in `src/components/ui/index.tsx` (Button, Input, Card, Dialog, Badge, Table, Tabs…).
4. **Backend**: Next.js API routes (not NestJS) – one app, one process, simpler to run.
5. **Socket.IO**: runs in a custom `server.ts` together with Next, so API routes can emit events directly.
   Consequence: deploy as a normal Node server (not serverless/Vercel).
6. **Auth**: own JWT session (jose, HS256) in an httpOnly cookie, bcrypt for passwords and PINs.
   PIN login = restaurant code + 4-digit PIN. 5 wrong passwords lock the account for 15 minutes.
7. **Database changes**: `prisma db push` is used during development for speed (no migration files yet).
8. **Full schema up-front**: all tables for phases 0–12 are in `schema.prisma` from Phase 0.
