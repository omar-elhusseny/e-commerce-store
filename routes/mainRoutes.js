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


const mainRoutes = (app) => {
    app.use("/api/v1/auth", authRoute)
    app.use("/api/v1/users", isAuth, usersRoute)
    app.use("/api/v1/products", productRoute)
    app.use("/api/v1/cart", isAuth, cartRoute)
    app.use("/api/v1/orders", isAuth, orderRoute)
    app.use("/api/v1/wishlist", isAuth, wishlistRoute)
    app.use("/api/v1/categories", isAuth, categoryRoute)
    app.use("/api/v1/subcategories", isAuth, subCategoryRoute)
    app.use("/api/v1/brands", isAuth, brandRoute)
    app.use("/api/v1/reviews", isAuth, reviewRoute)
    app.use("/api/v1/coupons", isAuth, allowedTo, couponRoute)
};

module.exports = mainRoutes;