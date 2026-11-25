// Interface for food aggregators (Swiggy, Zomato, ONDC…). Only a MOCK exists now; real ones plug in here later.
export type NormalizedOrder = {
  externalId: string; platform: string; customerName: string; customerPhone?: string; address?: string;
  items: { externalItemName: string; menuItemId?: string; quantity: number; price: number }[]; total: number; notes?: string;
};
export interface Aggregator {
  name: string;
  /** Turn the platform's webhook body into our shape. Throw if the body is not valid. */
  parseOrder(body: unknown): NormalizedOrder;
  /** Tell the platform we accepted / food is ready (no-op in mock). */
  updateStatus(externalId: string, status: "ACCEPTED" | "READY" | "REJECTED"): Promise<void>;
}
export class MockAggregator implements Aggregator {
  constructor(public name: string) {}
  parseOrder(body: any): NormalizedOrder {
    if (!body?.order_id || !Array.isArray(body.items) || !body.items.length) throw new Error("Invalid aggregator order");
    return {
      externalId: String(body.order_id), platform: this.name, customerName: body.customer?.name || `${this.name} customer`, customerPhone: body.customer?.phone, address: body.customer?.address,
      items: body.items.map((i: any) => ({ externalItemName: String(i.name), menuItemId: i.item_id, quantity: Number(i.quantity) || 1, price: Number(i.price) || 0 })),
      total: Number(body.total) || 0, notes: body.instructions,
    };
  }
  async updateStatus() {}
}
export const AGGREGATORS: Record<string, Aggregator> = { SWIGGY: new MockAggregator("SWIGGY"), ZOMATO: new MockAggregator("ZOMATO") };
