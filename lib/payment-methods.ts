export type PaymentMethodSetting = {
  id: string;
  name: string;
  description: string;
  badge: string;
  isActive: boolean;
};

export const bakongPaymentMethod: PaymentMethodSetting = {
  id: "bakong-khqr",
  name: "Bakong KHQR",
  description: "Scan and pay with Bakong KHQR",
  badge: "KHQR",
  isActive: true
};

export const defaultPaymentMethods: PaymentMethodSetting[] = [
  bakongPaymentMethod
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
  if (!Array.isArray(value) || !value.length) return defaultPaymentMethods;

  const selectedBakong = value.find((entry) => {
    const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const id = String(record.id || "").trim().toLowerCase();
    const name = String(record.name || "").trim().toLowerCase();
    return id === "bakong-khqr" || name === "bakong khqr";
  });

  if (!selectedBakong) return defaultPaymentMethods;

  const record = selectedBakong as Record<string, unknown>;
  const description = String(record.description || "").trim();
  const badge = String(record.badge || bakongPaymentMethod.badge).trim().slice(0, 8) || bakongPaymentMethod.badge;
  const isActive = typeof record.isActive === "boolean" ? record.isActive : true;

  return [
    {
      ...bakongPaymentMethod,
      description: description || bakongPaymentMethod.description,
      badge,
      isActive
    }
  ];
}
