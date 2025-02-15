# 🛒 E-Commerce Backend API

A RESTful e-commerce backend built with **Node.js**, **Express.js**, and **MongoDB**. This project provides authentication, product management, cart and order handling, and wishlist functionality.

## 🚀 Features

- **User Authentication:** Register, login, logout, and reset password (JWT & Redis-based).
- **Products:** Get all products, get by ID, add, update, and delete (admin only).
- **Cart:** Add, update, delete, and view user’s cart.
- **Orders:** Create, update (admin only), and view orders.
- **Wishlist:** Add, remove, and view items.

---

## 🛠️ Installation

### Prerequisites
- **Node.js** installed
- **MongoDB** running
- **Redis** installed (for token blacklisting)

### Steps
1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/e-commerce-backend.git
   cd e-commerce-backend
2. Install dependencies:
   ```sh
   npm install
3. Create a .env file and configure environment variables:
   ```sh
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   STRIPE_SECRET_KEY=your_stripe_secret
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
4. Start the server:
   ```sh
   npm run dev

---

## 📌 API Endpoints

#### Auth Routes
- POST /api/v1/auth/register – Register a new user
- POST /api/v1/auth/login – Login user
- POST /api/v1/auth/forget-password
- POST /api/v1/auth/verify-reset-code
- POST /api/v1/auth/reset-password
- POST /api/v1/auth/refresh-token (admin-only)

#### User Routes
- GET /api/v1/users/profile – Get user's profile
- POST /api/v1/users/logout – Register a new user
- POST /api/v1/users/addresses – Add user address (One of user's infomation)
- PUT /api/v1/users/:id – Update user's info
- PUT /api/v1/users/addresses/:addressId – Update user address
- PUT /api/v1/users/:id/password – Update user password
- DELETE /api/v1/users/addresses/:addressId – delete user address
- DELETE /api/v1/users/:id/deactivate – Deactivate user's account
- DELETE /api/v1/users/:id – Delete user's account

#### Product Routes
- GET /api/v1/products – Get all products
- GET /api/v1/products/:id – Get product by ID
- POST /api/v1/products – Add product (admin only)
- PUT /api/v1/products/:id – Update product (admin only)
- DELETE /api/v1/products/:id – Delete product (admin only)
- (GET,POST) /api/v1/products/:productId/reviews - Get the reviews of a specific product / add a review (Nested route)
- (GET,POST) /api/v1/products/:productId/wishlist - Get a product from wishlist / add a product (Nested route)

#### Cart Routes
- GET /api/v1/cart – View cart
- POST /api/v1/cart – Add to cart
- PUT /api/v1/cart/:id – Update cart
- PUT /api/v1/cart/applyCoupon - add a coupon to the total of the cart
- DELETE /api/v1/cart/:id – Remove item from cart

#### Order Routes
- GET /api/v1/orders – View orders
- GET /api/v1/orders/:id – View order by ID
- POST /api/v1/orders – Create order
- PUT /api/v1/orders/:id – Update order (admin only)
- PUT /api/v1/orders/:id/pay – Update order status if the payment done by cash

#### Wishlist Routes
- GET /api/v1/wishlist – View wishlist
- POST /api/v1/wishlist – Add to wishlist
- DELETE /api/v1/wishlist/:id - remove product from wishlist
- DELETE /api/v1/wishlist/clear - clear all products in wishlist at once

#### Category Routes
- GET /api/v1/categories – View categories
- GET /api/v1/categories/:id - Get a specific category
- POST /api/v1/categories – Add a category (admin only)
- PUT /api/v1/categories/:id - update a specific category (admin only)
- DELETE /api/v1/categories/:id - remove a specific category (admin only)
- (GET, POST) /api/v1/categories/:categoryId/subcategories (Nested route)

#### Brand Routes
- GET /api/v1/brands – View brands
- GET /api/v1/brands/:id - Get a specific brand
- POST /api/v1/brands – Add a brand (admin only)
- PUT /api/v1/brands/:id - update a specific brand (admin only)
- DELETE /api/v1/brands/:id - remove a specific brand (admin only)

#### Coupons Routes (admin only)
- GET /api/v1/coupons – View coupons
- GET /api/v1/coupons/:id - Get a specific coupon
- POST /api/v1/coupons – Add a coupon
- PUT /api/v1/coupons/:id - update a specific coupon
- DELETE /api/v1/coupons/:id - remove a specific coupon

#### Reviews Routes
- GET /api/v1/reviews – View reviews
- GET /api/v1/reviews/:id - Get a specific review
- POST /api/v1/reviews – Add a review
- PUT /api/v1/reviews/:id - update a specific review
- DELETE /api/v1/reviews/:id - remove a specific review

#### Subcategory Routes
- GET /api/v1/subcategories – View subcategories
- GET /api/v1/subcategories/:id - Get a specific subcategories
- POST /api/v1/subcategories – Add a subcategories (admin only)
- PUT /api/v1/subcategories/:id - update a specific subcategories (admin only)
- DELETE /api/v1/subcategories/:id - remove a specific subcategories (admin only)


---


## 📜 Technologies Used
- Node.js & Express.js (Backend)
- MongoDB & Mongoose (Database)
- Redis (Token Blacklist)
- JWT (Authentication)
- Stripe (Payment Gateway)
- SendGrid (Sending Emails to users)


---

## 👨‍💻 Contributing
- Fork the project
- Create a new branch (git checkout -b feature-name)
- Commit changes (git commit -m "Add feature")
- Push to branch (git push origin feature-name)
- Open a Pull Request
















