import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/, "Username can only use letters, numbers, and underscore"),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6)
});

export const registerWithOtpSchema = registerSchema.extend({
  verificationToken: z.string().min(10),
  verificationCode: z.string().length(6)
});

export const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1)
});

export const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  price: z.coerce.number().positive(),
  salePrice: z.preprocess((value) => (value === "" ? null : value), z.coerce.number().positive().nullable().optional()),
  stock: z.coerce.number().int().min(0),
  brand: z.preprocess((value) => (value === "" ? null : value), z.string().min(2).nullable().optional()),
  category: z.string().min(2),
  style: z.string().optional().default("Essentials"),
  imageUrl: z.string().min(1).refine((value) => {
    if (value.startsWith("/")) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, "Image URL must be a valid URL or local upload path"),
  isOnSale: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  promotionLabel: z.string().optional().nullable()
});

export const orderSchema = z.object({
  customerName: z.string().min(2),
  phone: z.string().min(6),
  address: z.string().min(8),
  province: z.string().min(2).optional(),
  note: z.string().optional().nullable(),
  contactTelegram: z.boolean().default(false),
  paymentMethod: z.string().default("ABA KHQR"),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive()
    })
  ).min(1)
});
