# API Smoke Checklist

Run after `npm start` and `npm run prisma:seed`.

## Auth

- POST `/api/v1/auth/login` with `user1@example.com` / `Password123!` returns tokens.
- POST `/api/v1/auth/login` wrong password returns 400/401.
- GET `/api/v1/users/profile` with bearer token returns user.

## Products & Catalog

- GET `/api/v1/products` returns paginated list.
- GET `/api/v1/products?keyword=apple&page=1&limit=5` returns filtered list.
- GET `/api/v1/categories`, `/api/v1/brands`, `/api/v1/subcategories` return data.

## Cart

- POST `/api/v1/cart` add product.
- GET `/api/v1/cart` returns cart with products.
- PUT `/api/v1/cart/:productId` updates quantity.
- DELETE `/api/v1/cart/:productId` removes item.

## Orders

- POST `/api/v1/orders` with `shippingAddress` + `paymentMethod=cash` creates order.
- GET `/api/v1/orders` returns user orders.
- PATCH `/api/v1/orders/:id/cancel` cancels allowed statuses.

## Reviews

- GET `/api/v1/products/:productId/reviews` returns reviews.
- POST `/api/v1/products/:productId/reviews` works only for delivered purchases.

## Wishlist

- POST `/api/v1/wishlist` add product.
- GET `/api/v1/wishlist` returns wishlist.
- DELETE `/api/v1/wishlist/:id` removes item.
