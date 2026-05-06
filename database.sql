CREATE DATABASE IF NOT EXISTS shadow_commerce
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE shadow_commerce;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS OrderItem;
DROP TABLE IF EXISTS `Order`;
DROP TABLE IF EXISTS Category;
DROP TABLE IF EXISTS Brand;
DROP TABLE IF EXISTS SiteSetting;
DROP TABLE IF EXISTS Product;
DROP TABLE IF EXISTS User;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE User (
  id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  username VARCHAR(191) NULL,
  email VARCHAR(191) NOT NULL,
  password VARCHAR(191) NOT NULL,
  role ENUM('ADMIN', 'STAFF', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
  commissionRate DOUBLE NOT NULL DEFAULT 0,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY User_username_key (username),
  UNIQUE KEY User_email_key (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Product (
  id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  salePrice DECIMAL(10, 2) NULL,
  deliveryFee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  brand VARCHAR(191) NULL,
  category VARCHAR(191) NOT NULL,
  style VARCHAR(191) NOT NULL DEFAULT 'Essentials',
  imageUrl VARCHAR(1000) NOT NULL,
  isOnSale BOOLEAN NOT NULL DEFAULT FALSE,
  isNewArrival BOOLEAN NOT NULL DEFAULT FALSE,
  promotionLabel VARCHAR(191) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY Product_name_key (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Brand (
  id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  logoUrl VARCHAR(1000) NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY Brand_name_key (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Category (
  id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  imageUrl VARCHAR(1000) NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY Category_name_key (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE SiteSetting (
  `key` VARCHAR(191) NOT NULL,
  `value` LONGTEXT NOT NULL,
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Order` (
  id VARCHAR(191) NOT NULL,
  customerName VARCHAR(191) NOT NULL,
  phone VARCHAR(191) NOT NULL,
  address TEXT NOT NULL,
  province VARCHAR(191) NULL,
  note TEXT NULL,
  contactTelegram BOOLEAN NOT NULL DEFAULT FALSE,
  paymentMethod VARCHAR(191) NOT NULL DEFAULT 'ABA KHQR',
  deliveryFee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  customerId VARCHAR(191) NULL,
  staffId VARCHAR(191) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY Order_customerId_idx (customerId),
  KEY Order_staffId_idx (staffId),
  CONSTRAINT Order_customerId_fkey FOREIGN KEY (customerId) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT Order_staffId_fkey FOREIGN KEY (staffId) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE OrderItem (
  id VARCHAR(191) NOT NULL,
  orderId VARCHAR(191) NOT NULL,
  productId VARCHAR(191) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (id),
  KEY OrderItem_orderId_idx (orderId),
  KEY OrderItem_productId_idx (productId),
  CONSTRAINT OrderItem_orderId_fkey FOREIGN KEY (orderId) REFERENCES `Order`(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT OrderItem_productId_fkey FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO User (id, name, username, email, password, role, commissionRate)
VALUES
  ('admin_user', 'Store Admin', 'admin', 'admin@eshadow.com', '$2a$10$B6RnvAMqgN42UBzTkYX/ZuQSnkc//iRCi4mngUY1tN.Id89FDS5Pm', 'ADMIN', 0);

INSERT INTO Product (id, name, description, price, salePrice, deliveryFee, stock, brand, category, style, imageUrl, isOnSale, isNewArrival, promotionLabel)
VALUES
  ('demo_oversized_tee', 'Hydrating Glow Serum', 'Lightweight daily serum for a soft, dewy complexion.', 39.00, NULL, 0.00, 40, 'VERSACE', 'Skincare', 'Glow', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1200&auto=format&fit=crop', FALSE, TRUE, NULL),
  ('demo_black_blazer', 'Velvet Matte Lipstick', 'Smooth high-pigment color with a soft matte finish.', 29.00, 22.00, 1.00, 32, 'GUCCI', 'Makeup', 'Lips', 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=1200&auto=format&fit=crop', TRUE, FALSE, '24% OFF'),
  ('demo_knit_sweater', 'Rose Cloud Moisturizer', 'Rich cream texture that leaves skin calm and smooth.', 49.00, NULL, 0.00, 24, 'PRADA', 'Skincare', 'Hydrate', 'https://images.unsplash.com/photo-1612817288484-6f916006741a?q=80&w=1200&auto=format&fit=crop', FALSE, TRUE, NULL),
  ('demo_relaxed_denim', 'Champagne Glow Palette', 'Soft shimmer shades for warm, luminous makeup looks.', 59.00, 45.00, 2.00, 30, 'Calvin Klein', 'Makeup', 'Glow', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=1200&auto=format&fit=crop', TRUE, FALSE, 'SALE');

INSERT INTO Brand (id, name, logoUrl, sortOrder, isActive)
VALUES
  ('brand_versace', 'VERSACE', NULL, 1, TRUE),
  ('brand_zara', 'ZARA', NULL, 2, TRUE),
  ('brand_gucci', 'GUCCI', NULL, 3, TRUE),
  ('brand_prada', 'PRADA', NULL, 4, TRUE),
  ('brand_calvin_klein', 'Calvin Klein', NULL, 5, TRUE);

INSERT INTO Category (id, name, imageUrl, sortOrder, isActive)
VALUES
  ('category_skincare', 'Skincare', 'https://images.unsplash.com/photo-1612817288484-6f916006741a?q=80&w=900&auto=format&fit=crop', 1, TRUE),
  ('category_makeup', 'Makeup', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=900&auto=format&fit=crop', 2, TRUE),
  ('category_fragrance', 'Fragrance', 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=900&auto=format&fit=crop', 3, TRUE);

INSERT INTO SiteSetting (`key`, `value`)
VALUES
  ('footer', '{"brandName":"LUMINA","description":"Premium skincare, makeup, and beauty essentials curated for a soft daily glow.","socials":[{"label":"TikTok","url":""},{"label":"Telegram","url":""},{"label":"Facebook","url":""},{"label":"Instagram","url":""}],"groups":[{"title":"Company","links":["About","Support","Contact"]},{"title":"Help","links":["About","Support","Contact"]},{"title":"Social","links":["About","Support","Contact"]}]}');
