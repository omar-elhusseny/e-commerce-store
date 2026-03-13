const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Product = require("../models/product.model");
const helperFunction = require("./crud.methods");
const asyncWrapper = require("../middleware/asyncWrapper");
const AppError = require("../utils/appError")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const getOrders = helperFunction.getAll(Order);

const getOrder = helperFunction.get(Order);

const checkout = asyncWrapper(async (req, res, next) => {
    const { shippingAddress, paymentMethod, testStripe } = req.body;

    // 1️⃣ Fetch user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate("products.productId");
    if (!cart || !cart.products.length) return next(new AppError("Cart is empty.", 400));

    // 2️⃣ Check stock availability
    const stockIssue = cart.products.find(item => item.productId.quantity < item.quantity);
    if (stockIssue) {
        const { productId, quantity } = stockIssue;
        return next(new AppError(
            `Not enough stock for product: ${productId.name}. Available: ${productId.quantity}, Requested: ${quantity}`,
            400
        ));
    }

    // 3️⃣ Calculate total price (consider discount)
    const totalPrice = cart.totalPriceAfterDiscount || cart.totalPrice;

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
        isPaid: paymentMethod === "cash" ? false : false,
        paymentDetails: { method: paymentMethod || "unknown" },
    });

    // 5️⃣ Update stock immediately if cash payment
    if (paymentMethod === "cash") {
        for (const item of cart.products) {
            const product = await Product.findById(item.productId._id);
            product.quantity -= item.quantity;
            product.sold += item.quantity;
            await product.save();
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

            // If testStripe flag is true, use Stripe test mode (your API keys should already be test keys)
            session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items: lineItems,
                mode: "payment",
                success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/cancel`,
                metadata: { orderId: order._id.toString(), testStripe: testStripe || false },
            });
        } catch (err) {
            console.error("Stripe session error:", err);
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

    // 9️⃣ Return response for Postman / frontend
    return res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: savedOrder,
        stripeUrl: session?.url || null,  // You can open this URL in Postman / browser
        testStripe: !!testStripe,         // Indicates this is a test session
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
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
        return next(new AppError(`Invalid status. Valid statuses: ${validStatuses.join(", ")}`, 400));
    }

    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError(`No order found with id: ${req.params.id}`, 404));

    // Prevent canceling delivered orders
    if (order.status === "delivered" && status === "cancelled") {
        return next(new AppError("Cannot cancel an order that has been delivered.", 400));
    }

    // Update stock if order is cancelled
    if (status === "cancelled" && order.status !== "cancelled") {
        for (const item of order.orderItems) {
            const product = await Product.findById(item.productId);
            product.quantity += item.quantity;
            product.sold -= item.quantity;
            await product.save();
        }
    }

    order.status = status;
    await order.save();

    res.status(200).json({ status: 'success', data: order });
});

const cancelOrder = asyncWrapper(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError(`No order found with id: ${req.params.id}`, 404));

    // Only pending or processing orders can be cancelled
    if (["shipped", "delivered", "cancelled"].includes(order.status)) {
        return next(new AppError("You cannot cancel this order.", 400));
    }

    // Update stock
    for (const item of order.orderItems) {
        const product = await Product.findById(item.productId);
        product.quantity += item.quantity;
        product.sold -= item.quantity;
        await product.save();
    }

    order.status = "cancelled";
    await order.save();

    res.status(200).json({ status: 'success', message: "Order cancelled successfully", data: order });
});

module.exports = { getOrders, getOrder, checkout, updateOrderToPaid, updateOrderStatus, cancelOrder }