"use client";
import * as React from "react";
import { io, Socket } from "socket.io-client";

export type Me = {
  user: { id: string; name: string; role: string };
  restaurant: { id: string; name: string; slug: string; type: string; currency: string; onboarded: boolean; logoUrl?: string | null; languages: string[] };
  branches: { id: string; name: string }[];
  branch: { id: string; name: string; settings: any } | null;
  features: Record<string, boolean>;
  nav: { href: string; label: string; icon: string }[];
};
const Ctx = React.createContext<{ me: Me | null; reload: () => void; socket: Socket | null }>({ me: null, reload: () => {}, socket: null });
export const useApp = () => React.useContext(Ctx);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = React.useState<Me | null>(null);
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const load = React.useCallback(() => {
    fetch("/api/auth/me").then(async (r) => {
      if (r.status === 401) { location.href = "/login"; return; }
      setMe(await r.json());
    });
  }, []);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    const s = io({ path: "/socket.io" });
    setSocket(s);
    return () => { s.disconnect(); };
  }, [me?.branch?.id]);
  return <Ctx.Provider value={{ me, reload: load, socket }}>{children}</Ctx.Provider>;
}

/** Subscribe to a live event for the current branch. */
export function useLive(event: string, cb: (data: any) => void) {
  const { socket } = useApp();
  const ref = React.useRef(cb);
  ref.current = cb;
  React.useEffect(() => {
    if (!socket) return;
    const h = (d: any) => ref.current(d);
    socket.on(event, h);
    return () => { socket.off(event, h); };
  }, [socket, event]);
}
