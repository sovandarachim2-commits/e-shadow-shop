export type Product = {
  id: string;
  name: string;
  description: string;
  price: number | string;
  salePrice?: number | string | null;
  deliveryFee?: number | string | null;
  stock: number;
  brand?: string | null;
  category: string;
  style?: string;
  imageUrl: string;
  isOnSale?: boolean;
  isNewArrival?: boolean;
  promotionLabel?: string | null;
};

export type Brand = {
  id: string;
  name: string;
  logoUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type Category = {
  id: string;
  name: string;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type CartItem = Product & {
  quantity: number;
};

export type UserSession = {
  id: string;
  name: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  commissionRate?: number;
};

export type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "COMPLETED" | "CANCELLED";

export type DeliveryZone = {
  id: string;
  name: string;
  price: number | string;
  freeDeliveryAmount?: number | string | null;
  isActive: boolean;
};
