// Message sending (SMS / WhatsApp / email) behind one interface. Default = mock: messages are only
// saved to the MessageLog table so you can see what would have been sent.
import { prisma } from "../db";

export type Channel = "SMS" | "WHATSAPP" | "EMAIL";
export interface MessageProvider { name: string; send(channel: Channel, to: string, body: string): Promise<{ ok: boolean; id?: string }> }

export class MockProvider implements MessageProvider {
  name = "mock";
  async send(_c: Channel, _to: string, _body: string) { return { ok: true, id: `mock_${Date.now()}` }; }
}
export function getProvider(): MessageProvider {
  // Real providers (MSG91, Twilio, Gupshup, SES…) can be added here, chosen by MESSAGE_PROVIDER.
  return new MockProvider();
}
export async function sendMessage(restaurantId: string | null, channel: Channel, to: string, body: string) {
  const r = await getProvider().send(channel, to, body);
  await prisma.messageLog.create({ data: { restaurantId, channel, to, body, status: r.ok ? (getProvider().name === "mock" ? "SENT_MOCK" : "SENT") : "FAILED" } });
  return r;
}
