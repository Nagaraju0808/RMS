// Emit live events from API routes. The Socket.IO server is created in server.ts.
export type LiveEvent =
  | "order:new" | "order:updated" | "kot:new" | "item:status" | "item:ready"
  | "table:updated" | "table:request" | "qr:pending" | "waitlist:updated"
  | "delivery:updated" | "feedback:low" | "stock:low";

export function emitToBranch(branchId: string, event: LiveEvent, data: unknown) {
  const io = (globalThis as any).__io;
  if (io) io.to(`branch:${branchId}`).emit(event, data);
}
export function emitToRoom(room: string, event: string, data: unknown) {
  const io = (globalThis as any).__io;
  if (io) io.to(room).emit(event, data);
}
