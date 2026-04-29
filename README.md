# Shadow Commerce

A full-stack modern e-commerce app built with Next.js App Router, React, Tailwind CSS, Prisma, MySQL, JWT auth, Cloudinary uploads, Zustand state, and a responsive admin dashboard.

## Quick Start

1. Install Node.js 20+ and MySQL. XAMPP MySQL works fine.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`, and Cloudinary keys.
3. Create the database:

```sql
CREATE DATABASE shadow_commerce;
```

4. Install dependencies:

```bash
npm install
```

5. Create the database tables and seed the admin/product data:

```bash
npm run prisma:migrate
npm run seed
```

6. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Seed Login

- Admin email: `admin@example.com`
- Admin password: `admin123`

## Main Routes

- Public: `/`, `/shop`, `/products/[id]`, `/cart`, `/checkout`, `/login`, `/register`
- Admin: `/admin/dashboard`, `/admin/products`, `/admin/orders`, `/admin/customers`, `/admin/staff`, `/admin/reports`
- API: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/products`, `/api/orders`, `/api/upload`, `/api/users`, `/api/reports`

## Notes

The storefront renders demo products if the database/API is not ready yet, so the UI can still be inspected while MySQL is being configured. Admin features require database setup and an authenticated admin/staff user.
