const Cart = require('../models/cart.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Coupon = require("../models/coupon.model");
const asyncWrapper = require("../middleware/asyncWrapper");
const AppError = require("../utils/appError");

/* -------------------------- Helper: Recalculate Total -------------------------- */
const calculateTotalPrice = (cart) => {
    return cart.products.reduce((total, item) => {
        return total + item.productId.price * item.quantity;
    }, 0);
};

/* ------------------------------- Add To Cart ---------------------------------- */
const addToCart = asyncWrapper(async (req, res, next) => {
    const { productId, quantity = 1 } = req.body;

    if (quantity < 1) {
        return next(new AppError("Quantity must be at least 1", 400));
    }

    const product = await Product.findById(productId);
    if (!product) return next(new AppError("Product not found", 404));

    if (product.isActive === false) {
        return next(new AppError("Product is not available", 400));
    }

    if (quantity > product.inventory) {
        return next(new AppError("Not enough stock", 400));
    }

    let cart = await Cart.findOne({ user: req.user._id }).populate(
        "products.productId",
        "price"
    );

    if (!cart) {
        cart = new Cart({
            user: req.user._id,
            products: [{ productId, quantity }],
        });
    } else {
        const existingItem = cart.products.find(
            (item) => item.productId._id.toString() === productId
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.products.push({ productId, quantity });
        }
    }

    await cart.populate("products.productId", "price");

    cart.totalPrice = calculateTotalPrice(cart);

    await cart.save();

    res.status(200).json({
        success: true,
        message: "Item added to cart",
        cart,
    });
});

/* ------------------------------- Get Cart ------------------------------------- */
const getUserCart = asyncWrapper(async (req, res) => {
    const userId = req.user._id;

    let cart = await Cart.findOne({ user: userId }).populate(
        "products.productId",
        "name images price isActive"
    );

    if (!cart) {
        cart = await Cart.create({
            user: userId,
            products: [],
        });
    }

    cart.products = cart.products.filter(
        (item) => item.productId && item.productId.isActive !== false
    );

    res.status(200).json({
        success: true,
        cart: {
            _id: cart._id,
            products: cart.products.map((item) => ({
                product: item.productId,
                quantity: item.quantity,
            })),
            totalPrice: cart.totalPrice,
            totalPriceAfterDiscount: cart.totalPriceAfterDiscount,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
        },
    });
});

/* ----------------------------- Update Cart Item ------------------------------- */
const updateCart = asyncWrapper(async (req, res, next) => {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
        return next(new AppError("Quantity must be at least 1", 400));
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate(
        "products.productId",
        "price inventory"
    );

    if (!cart) return next(new AppError("Cart not found", 404));

    const item = cart.products.find(
        (item) => item.productId._id.toString() === productId
    );

    if (!item) return next(new AppError("Item not found in cart", 404));

    if (quantity > item.productId.inventory) {
        return next(new AppError("Not enough stock", 400));
    }

    item.quantity = quantity;

    cart.totalPrice = calculateTotalPrice(cart);

    await cart.save();

    res.status(200).json({
        success: true,
        message: "Cart updated successfully",
        cart,
    });
});

/* ----------------------------- Delete From Cart ------------------------------- */
const deleteFromCart = asyncWrapper(async (req, res, next) => {
    const productId = req.params.id;

    const cart = await Cart.findOne({ user: req.user._id }).populate(
        "products.productId",
        "price"
    );

    if (!cart) return next(new AppError("Cart not found", 404));

    const productIndex = cart.products.findIndex(
        (item) => item.productId._id.toString() === productId
    );

    if (productIndex === -1)
        return next(new AppError("Item not found in cart", 404));

    cart.products.splice(productIndex, 1);

    cart.totalPrice = calculateTotalPrice(cart);

    await cart.save();

    res.status(200).json({
        success: true,
        message: "Item removed from cart",
        cart,
    });
});

/* ------------------------------- Clear cart --------------------------------- */
const clearCart = asyncWrapper(async (req, res, next) => {

    const cart = await Cart.findOneAndUpdate(
        { user: req.user._id },
        {
            products: [],
            totalPrice: 0,
            totalPriceAfterDiscount: 0
        },
        { new: true }
    );

    if (!cart) {
        return next(new AppError("Cart not found", 404));
    }

    res.status(200).json({
        success: true,
        message: "Cart cleared successfully",
        cart
    });

});

/* ------------------------------- Apply Coupon --------------------------------- */
const applyCoupon = asyncWrapper(async (req, res, next) => {
    const couponCode = req.body.coupon?.trim().toUpperCase();
    if (!couponCode) return next(new AppError("Coupon code is required", 400));

    // 1️⃣ Find coupon with all validations
    const coupon = await Coupon.findOne({
        name: couponCode,
        expire: { $gt: Date.now() },
        isActive: true,
        $or: [
            { usageLimit: null },               // unlimited usage
            { usedCount: { $lt: "$usageLimit" } }  // usage limit not exceeded
        ]
    });

    if (!coupon) {
        return next(new AppError("Coupon is invalid, expired, or exceeded usage limit", 400));
    }

    // 2️⃣ Get user's cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return next(new AppError("Cart not found", 404));

    // 3️⃣ Check minimum order value
    if (cart.totalPrice < coupon.minOrderValue) {
        return next(
            new AppError(
                `Cart total must be at least ${coupon.minOrderValue} to apply this coupon`,
                400
            )
        );
    }

    // 4️⃣ Calculate total price after discount
    const totalPriceAfterDiscount = cart.totalPrice - cart.totalPrice * (coupon.discount / 100);
    cart.totalPriceAfterDiscount = Number(totalPriceAfterDiscount.toFixed(2));

    // 5️⃣ Optionally store the coupon in cart (if you have a coupon field)
    cart.coupon = coupon._id;

    await cart.save();

    // 6️⃣ Increment coupon usage count atomically
    if (coupon.usageLimit !== null) {
        await Coupon.findByIdAndUpdate(
            coupon._id,
            { $inc: { usedCount: 1 } },
            { new: true }
        );
    }

    res.status(200).json({
        success: true,
        message: "Coupon applied successfully",
        cart,
    });
});

/* ------------------------------- Remove Coupon --------------------------------- */
const removeCoupon = asyncWrapper(async (req, res, next) => {
    // 1️⃣ Find the user's cart
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
        return next(new AppError("Cart not found", 404));
    }

    // 2️⃣ Check if a coupon is applied
    if (!cart.coupon) {
        return next(new AppError("No coupon applied to this cart", 400));
    }

    // 3️⃣ Reset coupon fields
    cart.coupon = null;
    cart.totalPriceAfterDiscount = 0;

    await cart.save();

    res.status(200).json({
        success: true,
        message: "Coupon removed successfully",
        cart
    });
});

module.exports = {
    addToCart,
    getUserCart,
    updateCart,
    deleteFromCart,
    applyCoupon,
    clearCart,
    removeCoupon
};