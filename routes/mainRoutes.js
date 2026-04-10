import usersRoute from "./users.route.js";
import authRoute from "./auth.route.js";
import productRoute from "./products.route.js";
import cartRoute from "./cart.route.js";
import orderRoute from "./orders.route.js";
import wishlistRoute from "./wishlist.route.js";
import categoryRoute from "./category.route.js";
import subCategoryRoute from "./subCategory.route.js";
import brandRoute from "./brand.route.js";
import reviewRoute from "./review.route.js";
import couponRoute from "./coupon.route.js";
import isAuth from "../middleware/isAuth.js";
import { allowedTo } from "../middleware/allowTo.js";
import rateLimit from "express-rate-limit";

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

export default mainRoutes;
