import asyncWrapper from "../middleware/asyncWrapper.js";
import AppError from "../utils/appError.js";
import logger from "../utils/logger.js";
import redisClient from "../config/redis.js";
import prisma from '../config/prisma.js';
import Stripe from "stripe";
import { sendEmail, emailTemplates } from "../utils/email.js";
import { buildOrderBy, buildPagination, buildSelect, buildWhere, sortQueryObject } from "../utils/prismaQuery.js";
import { ok, created as sendCreated, noContent } from "../utils/apiResponse.js";

const MODEL_KEY = "orders";
const getStripeClient = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new AppError("Stripe is not configured. Missing STRIPE_SECRET_KEY", 500);
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const getOrders = asyncWrapper(async (req, res) => {
    const forcedFilter = req.user.role === "user" ? { userId: req.user.id } : {};
    const sortedQuery = sortQueryObject(req.query);
    const cacheKey = `${MODEL_KEY}:${JSON.stringify(forcedFilter)}:${JSON.stringify(sortedQuery)}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.status(200).json(JSON.parse(cachedData));

    const { page, limit, skip } = buildPagination(req.query);
    const where = buildWhere(req.query, forcedFilter);
    const [data, total] = await Promise.all([
        prisma.order.findMany({ where, skip, take: limit, orderBy: buildOrderBy(req.query.sort), select: buildSelect(req.query.fields) }),
        prisma.order.count({ where }),
    ]);

    const response = {
        results: data.length,
        paginationResult: { page, limit, pages: Math.ceil(total / limit), next: page * limit < total ? page + 1 : null, previous: page > 1 ? page - 1 : null },
        data,
    };

    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 3600 });
    return ok(res, response.data, "Fetched successfully", { results: response.results, paginationResult: response.paginationResult });
});

const getOrder = asyncWrapper(async (req, res, next) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) return next(new AppError(`No order found with id: ${req.params.id}`, 404));
    if (req.user.role === 'user' && order.userId !== req.user.id) return next(new AppError('You are not allowed to view this order', 403));
    return ok(res, order, "Fetched successfully");
});

const checkout = asyncWrapper(async (req, res, next) => {
    const { shippingAddress, paymentMethod, testStripe } = req.body;
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id }, include: { items: { include: { product: true } } } });
    if (!cart || !cart.items.length) return next(new AppError("Cart is empty.", 400));

    const priceChanges = [];
    for (const item of cart.items) {
        const fresh = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!fresh || !fresh.isActive) return next(new AppError(`Product "${item.product.name}" is no longer available.`, 400));
        if (fresh.inventory < item.quantity) return next(new AppError(`Not enough stock for "${fresh.name}". Available: ${fresh.inventory}, Requested: ${item.quantity}`, 400));
        if (Math.abs(fresh.price - item.product.price) > 0.01) priceChanges.push({ name: fresh.name, oldPrice: item.product.price, newPrice: fresh.price });
        item.product.price = fresh.price;
    }

    if (priceChanges.length > 0) return next(new AppError(`Some prices changed since you added items to your cart. Please review: ${priceChanges.map(p => `${p.name}: was ${p.oldPrice}, now ${p.newPrice}`).join('; ')}`, 409));

    const freshTotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const couponDiscount = (cart.totalPriceAfterDiscount > 0 && cart.totalPriceAfterDiscount < cart.totalPrice) ? (cart.totalPrice - cart.totalPriceAfterDiscount) / cart.totalPrice : 0;
    const totalPrice = couponDiscount > 0 ? Number((freshTotal * (1 - couponDiscount)).toFixed(2)) : freshTotal;
    const orderCreateData = {
        userId: req.user.id,
        username: req.user.username,
        totalPrice,
        shippingAddress,
        isPaid: false,
        paymentMethod: paymentMethod || 'unknown',
        items: {
            create: cart.items.map(item => ({ productId: item.productId, product: item.product.name, price: item.product.price, quantity: item.quantity })),
        },
    };

    let order;

    if (paymentMethod === "cash") {
        order = await prisma.$transaction(async (tx) => {
            const createdOrder = await tx.order.create({ data: orderCreateData, include: { items: true } });

            for (const item of cart.items) {
                const updated = await tx.product.updateMany({
                    where: { id: item.productId, inventory: { gte: item.quantity } },
                    data: { inventory: { decrement: item.quantity }, sold: { increment: item.quantity } },
                });
                if (!updated.count) {
                    throw new AppError(`"${item.product.name}" just sold out. Remove it from your cart and try again.`, 409);
                }
            }

            if (cart.couponId) {
                await tx.coupon.update({ where: { id: cart.couponId }, data: { usedCount: { increment: 1 } } });
            }

            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            await tx.cart.update({ where: { id: cart.id }, data: { totalPrice: 0, totalPriceAfterDiscount: 0, couponId: null } });
            return createdOrder;
        });
    } else {
        order = await prisma.order.create({ data: orderCreateData, include: { items: true } });
    }

    let session = null;
    if (paymentMethod === "card") {
        try {
            const stripe = getStripeClient();
            const lineItems = cart.items.map(item => ({
                price_data: {
                    currency: "egp",
                    product_data: { name: item.product.name, description: item.product.description, images: [item.product.mainImage] },
                    unit_amount: Math.round(item.product.price * 100),
                },
                quantity: item.quantity,
            }));

            session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items: lineItems,
                mode: "payment",
                success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/cancel`,
                metadata: { orderId: order.id, testStripe: testStripe || false },
            });
        } catch (err) {
            logger.error(`Stripe session error: ${err.message}`);
            return next(new AppError("Failed to create Stripe session. Check your API keys or network.", 500));
        }
    }

    if (paymentMethod !== "cash") {
        const txOps = [
            prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
            prisma.cart.update({ where: { id: cart.id }, data: { totalPrice: 0, totalPriceAfterDiscount: 0, couponId: null } }),
        ];
        if (cart.couponId) {
            txOps.push(prisma.coupon.update({ where: { id: cart.couponId }, data: { usedCount: { increment: 1 } } }));
        }
        await prisma.$transaction(txOps);
    }

    const pattern = `${MODEL_KEY}:*${req.user.id}*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length) await redisClient.del(keys);

    try {
        await sendEmail({ to: req.user.email, ...emailTemplates.orderConfirmation(req.user.username, order) });
    } catch (emailErr) {
        logger.warn(`Order confirmation email failed: ${emailErr.message}`);
    }

    return sendCreated(res, order, "Order created successfully", { stripeUrl: session?.url || null, testStripe: !!testStripe });
});

const updateOrderToPaid = asyncWrapper(async (req, res, next) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return next(new AppError(`No order found with id: ${req.params.id}`, 404));

    const updated = await prisma.order.update({ where: { id: order.id }, data: { isPaid: true, paidAt: new Date(), status: order.status === 'pending' ? 'processing' : order.status } });
    return ok(res, updated, "Updated successfully");
});

const updateOrderStatus = asyncWrapper(async (req, res, next) => {
    const { status } = req.body;
    const validStatuses = ["pending", "processing", "shipped", "delivered"];
    if (!validStatuses.includes(status)) return next(new AppError(`Invalid status. Valid statuses: ${validStatuses.join(", ")}`, 400));

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return next(new AppError(`No order found with id: ${req.params.id}`, 404));
    if (order.status === "delivered" && status !== "delivered") return next(new AppError("Delivered orders cannot be modified.", 400));

    const updated = await prisma.order.update({ where: { id: order.id }, data: { status } });

    try {
        const user = await prisma.user.findUnique({ where: { id: updated.userId }, select: { email: true, username: true } });
        if (user) {
            await sendEmail({ to: user.email, ...emailTemplates.orderStatusUpdate(user.username, updated) });
        }
    } catch (err) {
        logger.warn(`Order status email failed: ${err.message}`);
    }

    return ok(res, updated, "Updated successfully");
});

const cancelOrder = asyncWrapper(async (req, res, next) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) return next(new AppError(`No order found with id: ${req.params.id}`, 404));
    if (req.user.role === 'user' && order.userId !== req.user.id) return next(new AppError('You are not allowed to cancel this order', 403));
    if (["shipped", "delivered", "cancelled"].includes(order.status)) return next(new AppError("You cannot cancel this order.", 400));

    for (const item of order.items) {
        await prisma.product.update({ where: { id: item.productId }, data: { inventory: { increment: item.quantity }, sold: { decrement: item.quantity } } });
    }

    if (order.isPaid && order.paymentMethod === "card" && order.paymentId) {
        try {
            const stripe = getStripeClient();
            await stripe.refunds.create({ payment_intent: order.paymentId });
            logger.info(`Stripe refund issued for order ${order.id}`);
        } catch (refundErr) {
            logger.error(`Stripe refund failed for order ${order.id}: ${refundErr.message}`);
        }
    }

    const updated = await prisma.order.update({ where: { id: order.id }, data: { status: "cancelled" } });

    try {
        const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { email: true, username: true } });
        if (user) {
            await sendEmail({ to: user.email, ...emailTemplates.orderStatusUpdate(user.username, updated) });
        }
    } catch (emailErr) {
        logger.warn(`Order cancellation email failed: ${emailErr.message}`);
    }

    return ok(res, updated, "Order cancelled successfully");
});

export { getOrders, getOrder, checkout, updateOrderToPaid, updateOrderStatus, cancelOrder };
