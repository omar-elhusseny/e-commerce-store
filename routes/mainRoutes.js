const usersRoute = require("./users.route");
const authRoute = require("./auth.route");
const productRoute = require("./products.route");
const cartRoute = require("./cart.route");
const orderRoute = require("./orders.route");
const wishlistRoute = require("./wishlist.route");
const categoryRoute = require("./category.route");
const subCategoryRoute = require("./subCategory.route");
const brandRoute = require("./brand.route");
const reviewRoute = require("./review.route");
const couponRoute = require("./coupon.route");
const isAuth = require("../middleware/isAuth");
const { allowedTo } = require("../middleware/allowTo");
const rateLimit = require("express-rate-limit");

const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

const mainRoutes = (app) => {
    // Auth — rate limited
    app.use("/api/v1/auth", authRateLimiter, authRoute);

    // Users — always requires auth
    app.use("/api/v1/users", isAuth, usersRoute);

    // Products — public reads; writes protected inside the route file
    app.use("/api/v1/products", productRoute);

    // Catalog — public reads (guests need to browse); writes protected inside each route file
    app.use("/api/v1/categories", categoryRoute);
    app.use("/api/v1/subcategories", subCategoryRoute);
    app.use("/api/v1/brands", brandRoute);

    // Reviews — nested under products (auth enforced per-route)
    app.use("/api/v1/reviews", isAuth, reviewRoute);

    // Cart, orders, wishlist — always require auth
    app.use("/api/v1/cart", isAuth, cartRoute);
    app.use("/api/v1/orders", isAuth, orderRoute);
    app.use("/api/v1/wishlist", isAuth, wishlistRoute);

    // Coupons — admin/manager only
    app.use("/api/v1/coupons", isAuth, allowedTo('admin', 'manager'), couponRoute);
};

module.exports = mainRoutes;
