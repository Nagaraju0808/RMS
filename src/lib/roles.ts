// Role-based permissions. The SERVER checks these in every API route (see lib/api.ts).
export const ROLES = ["OWNER", "MANAGER", "CASHIER", "WAITER", "CHEF", "DELIVERY", "CUSTOMER"] as const;
export type RoleName = (typeof ROLES)[number];

export const PERMISSIONS = {
  "settings.manage": ["OWNER"],
  "branch.manage": ["OWNER", "MANAGER"],
  "menu.view": ["OWNER", "MANAGER", "CASHIER", "WAITER", "CHEF"],
  "menu.manage": ["OWNER", "MANAGER"],
  "menu.stock": ["OWNER", "MANAGER", "CASHIER", "CHEF"],
  "tables.view": ["OWNER", "MANAGER", "CASHIER", "WAITER"],
  "tables.manage": ["OWNER", "MANAGER"],
  "orders.create": ["OWNER", "MANAGER", "CASHIER", "WAITER"],
  "orders.view": ["OWNER", "MANAGER", "CASHIER", "WAITER", "CHEF"],
  "orders.cancel": ["OWNER", "MANAGER", "CASHIER"],
  "orders.discount": ["OWNER", "MANAGER", "CASHIER"],
  "kitchen.view": ["OWNER", "MANAGER", "CHEF"],
  "billing.manage": ["OWNER", "MANAGER", "CASHIER"],
  "billing.refund": ["OWNER", "MANAGER"],
  "cash.close": ["OWNER", "MANAGER", "CASHIER"],
  "reservations.manage": ["OWNER", "MANAGER", "CASHIER", "WAITER"],
  "delivery.manage": ["OWNER", "MANAGER", "CASHIER"],
  "delivery.ride": ["DELIVERY"],
  "inventory.manage": ["OWNER", "MANAGER"],
  "inventory.view": ["OWNER", "MANAGER", "CHEF"],
  "staff.manage": ["OWNER", "MANAGER"],
  "staff.self": ["OWNER", "MANAGER", "CASHIER", "WAITER", "CHEF", "DELIVERY"],
  "audit.view": ["OWNER", "MANAGER"],
  "customers.manage": ["OWNER", "MANAGER", "CASHIER"],
  "reports.view": ["OWNER", "MANAGER"],
  "ai.use": ["OWNER", "MANAGER"],
} as const satisfies Record<string, readonly RoleName[]>;
export type Permission = keyof typeof PERMISSIONS;

/** Manager approval is needed for these (complimentary items, big discounts). */
export const APPROVER_ROLES: RoleName[] = ["OWNER", "MANAGER"];

export function can(role: string, perm: Permission, extra: string[] = []): boolean {
  if (extra.includes(perm)) return true;
  return (PERMISSIONS[perm] as readonly string[]).includes(role);
}

export type NavItem = { href: string; label: string; perm: Permission; feature?: string; icon: string; group: "Service" | "Guests" | "Back office" | "You" };
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", perm: "reports.view", icon: "LayoutDashboard", group: "Service" },
  { href: "/pos", label: "POS", perm: "orders.create", icon: "ShoppingCart", group: "Service" },
  { href: "/waiter", label: "Waiter", perm: "orders.create", feature: "tables", icon: "Smartphone", group: "Service" },
  { href: "/tables", label: "Tables", perm: "tables.view", feature: "tables", icon: "LayoutGrid", group: "Service" },
  { href: "/orders", label: "Orders", perm: "orders.view", icon: "ClipboardList", group: "Service" },
  { href: "/kitchen", label: "Kitchen", perm: "kitchen.view", icon: "ChefHat", group: "Service" },
  { href: "/billing", label: "Billing", perm: "billing.manage", icon: "Receipt", group: "Service" },
  { href: "/reservations", label: "Reservations", perm: "reservations.manage", feature: "reservations", icon: "CalendarDays", group: "Guests" },
  { href: "/deliveries", label: "Deliveries", perm: "delivery.manage", feature: "delivery", icon: "Bike", group: "Guests" },
  { href: "/rider", label: "My deliveries", perm: "delivery.ride", icon: "Bike", group: "Guests" },
  { href: "/menu", label: "Menu", perm: "menu.view", icon: "UtensilsCrossed", group: "Back office" },
  { href: "/inventory", label: "Inventory", perm: "inventory.view", feature: "inventory", icon: "Package", group: "Back office" },
  { href: "/customers", label: "Customers", perm: "customers.manage", icon: "Users", group: "Guests" },
  { href: "/staff", label: "Staff", perm: "staff.manage", icon: "UserCog", group: "Back office" },
  { href: "/me", label: "My shift", perm: "staff.self", icon: "Clock", group: "You" },
  { href: "/reports", label: "Reports", perm: "reports.view", icon: "BarChart3", group: "Back office" },
  { href: "/smart", label: "Smart insights", perm: "ai.use", icon: "Sparkles", group: "Back office" },
  { href: "/audit", label: "Audit log", perm: "audit.view", icon: "ShieldCheck", group: "Back office" },
  { href: "/settings", label: "Settings", perm: "settings.manage", icon: "Settings", group: "Back office" },
];

export function navForRole(role: string, features: Record<string, boolean>, extra: string[] = []) {
  return NAV.filter((n) => can(role, n.perm, extra) && (!n.feature || features[n.feature] !== false));
}
