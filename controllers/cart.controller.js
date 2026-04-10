import prisma from '../config/prisma.js';
import asyncWrapper from "../middleware/asyncWrapper.js";
import AppError from "../utils/appError.js";

const calculateTotalPrice = (items) => items.reduce((total, item) => total + item.product.price * item.quantity, 0);

const getOrCreateCart = async (userId) => {
    let cart = await prisma.cart.findUnique({ where: { userId }, include: { items: { include: { product: true } } } });
    if (!cart) {
        cart = await prisma.cart.create({ data: { userId }, include: { items: { include: { product: true } } } });
    }
    return cart;
};

const addToCart = asyncWrapper(async (req, res, next) => {
    const { productId, quantity = 1 } = req.body;
    if (quantity < 1) return next(new AppError("Quantity must be at least 1", 400));

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return next(new AppError("Product not found", 404));
    if (!product.isActive) return next(new AppError("Product is not available", 400));
    if (quantity > product.inventory) return next(new AppError("Not enough stock", 400));

    const cart = await getOrCreateCart(req.user.id);
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (existingItem) {
        await prisma.cartItem.update({ where: { id: existingItem.id }, data: { quantity: existingItem.quantity + Number(quantity) } });
    } else {
        await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: Number(quantity) } });
    }

    const updated = await prisma.cart.findUnique({ where: { id: cart.id }, include: { items: { include: { product: true } } } });
    const totalPrice = calculateTotalPrice(updated.items);
    await prisma.cart.update({ where: { id: cart.id }, data: { totalPrice } });

    res.status(200).json({ success: true, message: "Item added to cart", cart: { ...updated, totalPrice } });
});

const getUserCart = asyncWrapper(async (req, res) => {
    const cart = await getOrCreateCart(req.user.id);
    const activeItems = cart.items.filter((item) => item.product && item.product.isActive !== false);

    res.status(200).json({
        success: true,
        cart: {
            _id: cart.id,
            products: activeItems.map((item) => ({ product: item.product, quantity: item.quantity })),
            totalPrice: cart.totalPrice,
            totalPriceAfterDiscount: cart.totalPriceAfterDiscount,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
        },
    });
});

const updateCart = asyncWrapper(async (req, res, next) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    if (quantity < 1) return next(new AppError("Quantity must be at least 1", 400));

    const cart = await getOrCreateCart(req.user.id);
    const item = cart.items.find((i) => i.productId === productId);
    if (!item) return next(new AppError("Item not found in cart", 404));
    if (quantity > item.product.inventory) return next(new AppError("Not enough stock", 400));

    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: Number(quantity) } });
    const updated = await prisma.cart.findUnique({ where: { id: cart.id }, include: { items: { include: { product: true } } } });
    const totalPrice = calculateTotalPrice(updated.items);
    await prisma.cart.update({ where: { id: cart.id }, data: { totalPrice } });

    res.status(200).json({ success: true, message: "Cart updated successfully", cart: { ...updated, totalPrice } });
});

const deleteFromCart = asyncWrapper(async (req, res, next) => {
    const productId = req.params.productId;
    const cart = await getOrCreateCart(req.user.id);
    const item = cart.items.find((i) => i.productId === productId);
    if (!item) return next(new AppError("Item not found in cart", 404));

    await prisma.cartItem.delete({ where: { id: item.id } });
    const updated = await prisma.cart.findUnique({ where: { id: cart.id }, include: { items: { include: { product: true } } } });
    const totalPrice = calculateTotalPrice(updated.items);
    await prisma.cart.update({ where: { id: cart.id }, data: { totalPrice } });

    res.status(200).json({ success: true, message: "Item removed from cart", cart: { ...updated, totalPrice } });
});

const clearCart = asyncWrapper(async (req, res, next) => {
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) return next(new AppError("Cart not found", 404));

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    const updated = await prisma.cart.update({ where: { id: cart.id }, data: { totalPrice: 0, totalPriceAfterDiscount: 0, couponId: null } });
    res.status(200).json({ success: true, message: "Cart cleared successfully", cart: updated });
});

const applyCoupon = asyncWrapper(async (req, res, next) => {
    const couponCode = req.body.coupon?.trim().toUpperCase();
    if (!couponCode) return next(new AppError("Coupon code is required", 400));

    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) return next(new AppError("Cart not found", 404));

    const coupon = await prisma.coupon.findFirst({
        where: {
            name: couponCode,
            expire: { gt: new Date() },
            isActive: true,
            OR: [{ usageLimit: null }, { usedCount: { lt: 1000000 } }],
        },
    });

    if (!coupon) return next(new AppError("Coupon is invalid, expired, or has reached its usage limit", 400));
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return next(new AppError("Coupon is invalid, expired, or has reached its usage limit", 400));
    if (cart.totalPrice < coupon.minOrderValue) return next(new AppError(`Minimum order value for this coupon is ${coupon.minOrderValue}`, 400));

    const totalPriceAfterDiscount = Number((cart.totalPrice - cart.totalPrice * (coupon.discount / 100)).toFixed(2));
    await prisma.cart.update({ where: { id: cart.id }, data: { totalPriceAfterDiscount, couponId: coupon.id } });

    const updated = await prisma.cart.findUnique({ where: { id: cart.id } });
    res.status(200).json({ success: true, message: "Coupon applied successfully", cart: updated });
});

const removeCoupon = asyncWrapper(async (req, res, next) => {
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) return next(new AppError("Cart not found", 404));
    if (!cart.couponId) return next(new AppError("No coupon applied to this cart", 400));

    const updated = await prisma.cart.update({ where: { id: cart.id }, data: { couponId: null, totalPriceAfterDiscount: 0 } });
    res.status(200).json({ success: true, message: "Coupon removed successfully", cart: updated });
});

export { addToCart, getUserCart, updateCart, deleteFromCart, applyCoupon, clearCart, removeCoupon };
