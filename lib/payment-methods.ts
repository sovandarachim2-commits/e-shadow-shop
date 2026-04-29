export type PaymentMethodSetting = {
  id: string;
  name: string;
  description: string;
  badge: string;
  isActive: boolean;
};

export const defaultPaymentMethods: PaymentMethodSetting[] = [
  {
    id: "aba-khqr",
    name: "ABA KHQR",
    description: "Scan to pay with any banking app",
    badge: "KHQR",
    isActive: true
  },
  {
    id: "acleda",
    name: "Acleda",
    description: "Pay with Acleda bank transfer",
    badge: "ACL",
    isActive: true
  }
];

function createMethodId(name: string, index: number) {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || `payment-method-${index + 1}`;
}

export function normalizePaymentMethods(value: unknown): PaymentMethodSetting[] {
  if (!Array.isArray(value)) return defaultPaymentMethods;

  const methods = value
    .map((entry, index) => {
      const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      const name = String(record.name || "").trim();
      if (!name) return null;

      return {
        id: String(record.id || createMethodId(name, index)),
        name,
        description: String(record.description || "").trim(),
        badge: String(record.badge || name.slice(0, 4).toUpperCase()).trim().slice(0, 8) || "PAY",
        isActive: record.isActive !== false
      };
    })
    .filter(Boolean) as PaymentMethodSetting[];

  return methods.length ? methods : defaultPaymentMethods;
}
