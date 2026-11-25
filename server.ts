// Custom server: runs Next.js and Socket.IO on the same port so API routes can
// push live updates (kitchen screen, table status, alerts).
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { jwtVerify } from "jose";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { path: "/socket.io" });
  (globalThis as any).__io = io;

  io.on("connection", async (socket) => {
    // Staff join their branch room using their session cookie.
    const cookie = socket.handshake.headers.cookie || "";
    const m = cookie.match(/df_session=([^;]+)/);
    if (m) {
      try {
        const { payload } = await jwtVerify(m[1], new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me-please-32chars-min"));
        if (payload.branchId) socket.join(`branch:${payload.branchId}`);
        socket.join(`user:${payload.sub}`);
      } catch {}
    }
    // Customers (QR page / tracking) can join a public room for their own order only.
    socket.on("watch", (room: string) => {
      if (typeof room === "string" && /^(order|delivery|table):[a-z0-9]+$/i.test(room)) socket.join(room);
    });
  });

  httpServer.listen(port, () => console.log(`> DineFlow ready on http://localhost:${port}`));
});
