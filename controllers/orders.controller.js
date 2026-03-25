const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Product = require("../models/product.model");
const helperFunction = require("./crud.methods");
const asyncWrapper = require("../middleware/asyncWrapper");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const redisClient = require("../config/redis");


const getOrders = (req, res, next) => {
    const forcedFilter = req.user.role === 'user' ? { userId: req.user._id } : {};
    return helperFunction.getAll(Order, null, forcedFilter)(req, res, next);
};

const getOrder = asyncWrapper(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError(`No order found with id: ${req.params.id}`, 404));
    if (req.user.role === 'user' && order.userId.toString() !== req.user._id.toString())
        return next(new AppError('You are not allowed to view this order', 403));
    return res.status(200).json({ data: order });
});

const checkout = asyncWrapper(async (req, res, next) => {
    const { shippingAddress, paymentMethod, testStripe } = req.body;

    // 1️⃣ Fetch user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate("products.productId");
    if (!cart || !cart.products.length) return next(new AppError("Cart is empty.", 400));

    // 2️⃣ Fetch fresh product data — validate stock AND detect stale prices
    const priceChanges = [];
    for (const item of cart.products) {
        const fresh = await Product.findById(item.productId._id);
        if (!fresh || !fresh.isActive) {
            return next(new AppError(`Product "${item.productId.name}" is no longer available.`, 400));
        }
        if (fresh.inventory < item.quantity) {
            return next(new AppError(
                `Not enough stock for "${fresh.name}". Available: ${fresh.inventory}, Requested: ${item.quantity}`,
                400
            ));
        }
        if (Math.abs(fresh.price - item.productId.price) > 0.01) {
            priceChanges.push({ name: fresh.name, oldPrice: item.productId.price, newPrice: fresh.price });
        }
        // Overwrite with fresh price so order is always calculated from current prices
        item.productId.price = fresh.price;
    }

    // If prices changed, reject the checkout so the user can review their cart
    if (priceChanges.length > 0) {
        return next(new AppError(
            `Some prices changed since you added items to your cart. Please review: ${priceChanges.map(p => `${p.name}: was ${p.oldPrice}, now ${p.newPrice}`).join('; ')}`,
            409
        ));
    }

    // 3️⃣ Re-calculate total from fresh prices
    const freshTotal = cart.products.reduce((sum, item) => sum + item.productId.price * item.quantity, 0);

    const couponDiscount = (cart.totalPriceAfterDiscount > 0 && cart.totalPriceAfterDiscount < cart.totalPrice) ?
        (cart.totalPrice - cart.totalPriceAfterDiscount) / cart.totalPrice : 0;

    const totalPrice = couponDiscount > 0 ?
        Number((freshTotal * (1 - couponDiscount)).toFixed(2)) : freshTotal;

    // 4️⃣ Create the order (unpaid by default)
    const order = new Order({
        userId: req.user._id,
        username: req.user.username,
        orderItems: cart.products.map(item => ({
            productId: item.productId._id,
            product: item.productId.name,
            price: item.productId.price,
            quantity: item.quantity,
        })),
        totalPrice,
        shippingAddress,
        isPaid: false,
        paymentDetails: { method: paymentMethod || "unknown" },
    });

    // 5️⃣ For cash payments: atomically decrement stock — prevents race conditions
    if (paymentMethod === "cash") {
        for (const item of cart.products) {
            const updated = await Product.findOneAndUpdate(
                { _id: item.productId._id, inventory: { $gte: item.quantity } },
                { $inc: { inventory: -item.quantity, sold: item.quantity } },
                { new: true }
            );
            if (!updated) {
                return next(new AppError(
                    `"${item.productId.name}" just sold out. Remove it from your cart and try again.`,
                    409
                ));
            }
        }
    }

    // 6️⃣ Stripe payment flow
    let session = null;
    if (paymentMethod === "card") {
        try {
            const lineItems = cart.products.map(item => ({
                price_data: {
                    currency: "egp",
                    product_data: {
                        name: item.productId.name,
                        description: item.productId.description,
                        images: [item.productId.mainImage],
                    },
                    unit_amount: Math.round(item.productId.price * 100),
                },
                quantity: item.quantity,
            }));

            session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items: lineItems,
                mode: "payment",
                success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/cancel`,
                metadata: { orderId: order._id.toString(), testStripe: testStripe || false },
            });
        } catch (err) {
            logger.error(`Stripe session error: ${err.message}`);
            return next(new AppError("Failed to create Stripe session. Check your API keys or network.", 500));
        }
    }

    // 7️⃣ Save the order
    const savedOrder = await order.save();

    // 8️⃣ Clear cart
    cart.products = [];
    cart.totalPrice = 0;
    cart.totalPriceAfterDiscount = 0;
    cart.coupon = null;
    await cart.save();

    // 9️⃣ Invalidate order cache for this user
    const pattern = `${Order.collection.name}:*${req.user._id}*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length) await redisClient.del(keys);

    // 🔟 Send order confirmation email (non-blocking — email failure must not break checkout)
    try {
        const { sendEmail, emailTemplates } = require('../utils/email');
        await sendEmail({
            to: req.user.email,
            ...emailTemplates.orderConfirmation(req.user.username, savedOrder),
        });
    } catch (emailErr) {
        logger.warn(`Order confirmation email failed: ${emailErr.message}`);
    }

    return res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: savedOrder,
        stripeUrl: session?.url || null,
        testStripe: !!testStripe,
    });
});

const updateOrderToPaid = asyncWrapper(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError(`No order found with id: ${req.params.id}`, 404));

    order.isPaid = true;
    order.paidAt = Date.now();
    if (order.status === "pending") order.status = "processing";

    await order.save();
    res.status(200).json({ status: 'success', data: order });
});

const updateOrderStatus = asyncWrapper(async (req, res, next) => {
    const { status } = req.body;
    const validStatuses = ["pending", "processing", "shipped", "delivered"];

    if (!validStatuses.includes(status)) {
        return next(new AppError(`Invalid status. Valid statuses: ${validStatuses.join(", ")}`, 400));
    }

    if (status === "cancelled") {
        return next(new AppError("Use the cancel order endpoint instead.", 400));
    }

    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError(`No order found with id: ${req.params.id}`, 404));

    if (order.status === "delivered" && status !== "delivered") {
        return next(new AppError("Delivered orders cannot be modified.", 400));
    }

    order.status = status;
    await order.save();

    // email (optional reuse helper later)
    try {
        const user = await require('../models/user.model').findById(order.userId).select('email username');

        if (user) {
            const { sendEmail, emailTemplates } = require('../utils/email');
            await sendEmail({
                to: user.email,
                ...emailTemplates.orderStatusUpdate(user.username, order),
            });
        }
    } catch (err) {
        logger.warn(`Order status email failed: ${err.message}`);
    }

    res.status(200).json({ status: 'success', data: order });
});

const cancelOrder = asyncWrapper(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError(`No order found with id: ${req.params.id}`, 404));

    // Users can only cancel their own orders; admins/managers can cancel any
    if (req.user.role === 'user' && order.userId.toString() !== req.user._id.toString())
        return next(new AppError('You are not allowed to cancel this order', 403));

    // Only pending or processing orders can be cancelled
    if (["shipped", "delivered", "cancelled"].includes(order.status)) {
        return next(new AppError("You cannot cancel this order.", 400));
    }

    // Atomically restore stock
    for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(item.productId, {
            $inc: { inventory: item.quantity, sold: -item.quantity }
        });
    }

    // Issue Stripe refund if the order was paid by card
    if (order.isPaid && order.paymentDetails?.method === "card" && order.paymentDetails?.id) {
        try {
            await stripe.refunds.create({ payment_intent: order.paymentDetails.id });
            logger.info(`Stripe refund issued for order ${order._id}`);
        } catch (refundErr) {
            logger.error(`Stripe refund failed for order ${order._id}: ${refundErr.message}`);
        }
    }

    order.status = "cancelled";
    await order.save();

    // Send cancellation email (non-blocking)
    try {
        const user = await require('../models/user.model').findById(order.userId).select('email username');
        if (user) {
            const { sendEmail, emailTemplates } = require('../utils/email');
            await sendEmail({
                to: user.email,
                ...emailTemplates.orderStatusUpdate(user.username, order),
            });
        }
    } catch (emailErr) {
        logger.warn(`Order cancellation email failed: ${emailErr.message}`);
    }

    res.status(200).json({ status: 'success', message: "Order cancelled successfully", data: order });
});

module.exports = { getOrders, getOrder, checkout, updateOrderToPaid, updateOrderStatus, cancelOrder }