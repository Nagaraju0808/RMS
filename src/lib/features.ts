// Restaurant type decides which features are switched on. Stored per branch in Branch.features.
export type Features = {
  tables: boolean; reservations: boolean; delivery: boolean; onlineOrders: boolean;
  qrOrdering: boolean; tokens: boolean; openTabs: boolean; happyHours: boolean;
  inventory: boolean; offline: boolean; centralMenu: boolean; weighing: boolean;
};
export const RESTAURANT_TYPES = {
  FINE_DINING: "Fine dining / family restaurant",
  QSR: "Quick service / fast food",
  CAFE: "Café / bakery",
  CLOUD_KITCHEN: "Cloud kitchen",
  BAR: "Bar / pub",
  FOOD_TRUCK: "Food truck / kiosk",
  CHAIN: "Chain with many branches",
} as const;
export type RestaurantTypeName = keyof typeof RESTAURANT_TYPES;

const base: Features = {
  tables: true, reservations: true, delivery: true, onlineOrders: true, qrOrdering: true,
  tokens: false, openTabs: false, happyHours: false, inventory: true, offline: true,
  centralMenu: false, weighing: false,
};
export function defaultFeatures(type: RestaurantTypeName): Features {
  switch (type) {
    case "FINE_DINING": return { ...base };
    case "QSR": return { ...base, tables: false, reservations: false, qrOrdering: false, tokens: true };
    case "CAFE": return { ...base, reservations: false, tokens: true, weighing: true };
    case "CLOUD_KITCHEN": return { ...base, tables: false, reservations: false, qrOrdering: false };
    case "BAR": return { ...base, openTabs: true, happyHours: true, delivery: false };
    case "FOOD_TRUCK": return { ...base, tables: false, reservations: false, delivery: false, qrOrdering: false, tokens: true };
    case "CHAIN": return { ...base, centralMenu: true };
  }
}
export function resolveFeatures(stored: unknown, type: RestaurantTypeName): Features {
  return { ...defaultFeatures(type), ...((stored as Partial<Features>) || {}) };
}

export type BranchSettings = {
  serviceChargePercent: number; packingChargePerItem: number; kdsWarnMins: number; kdsLateMins: number;
  qrAutoAccept: boolean; roundOff: boolean; interState: boolean; avgTableMins: number;
};
export const DEFAULT_SETTINGS: BranchSettings = {
  serviceChargePercent: 0, packingChargePerItem: 0, kdsWarnMins: 10, kdsLateMins: 20,
  qrAutoAccept: false, roundOff: true, interState: false, avgTableMins: 45,
};
export function resolveSettings(stored: unknown): BranchSettings {
  return { ...DEFAULT_SETTINGS, ...((stored as Partial<BranchSettings>) || {}) };
}
