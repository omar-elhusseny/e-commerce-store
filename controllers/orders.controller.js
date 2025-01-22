const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const helperFunction = require("./crud.methods");
const asyncWrapper = require("../middleware/asyncWrapper");
const AppError = require("../utils/appError")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const getOrders = helperFunction.getAll(Order);

const getOrder = helperFunction.get(Order);

const checkout = asyncWrapper(async (req, res, next) => {
    const { shippingAddress, paymentMethod } = req.body;

    // Fetch the user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate("products.productId");
    if (!cart || !cart.products.length) return next(new AppError("Cart is empty.", 400));

    // Check stock availability
    const stockChecking = cart.products.find(item => item.productId.quantity < item.quantity);
    if (stockChecking) {
        const { productId, quantity } = stockChecking;
        return next(new AppError(`Not enough stock for product: ${productId.name}. Available quantity: ${productId.quantity}, Requested quantity: ${quantity}`, 400));
    }

    // Calculate total price
    const cartTotalPrice = cart.totalPriceAfterDiscount ? cart.totalPriceAfterDiscount : cart.totalPrice;

    // Create the order (unpaid by default)
    const order = new Order({
        userId: req.user._id,
        username: req.user.username,
        orderItems: cart.products.map(item => ({
            productId: item.productId._id,
            product: item.productId.name,
            price: item.productId.price,
            quantity: item.quantity,
        })),
        totalPrice: cartTotalPrice,
        shippingAddress,
        isPaid: false,
        paymentDetails: {
            method: paymentMethod || "unknown"
        }
    });

    // Update product quantity and sold count for cash payment
    if (paymentMethod === "cash") {
        for (const item of cart.products) {
            const product = item.productId;
            product.quantity -= item.quantity;
            product.sold += item.quantity;
            await product.save();
        }
    }


    // Stripe session logic (card payment)
    let session;
    if (paymentMethod === "card") {
        // Prepare line items for Stripe
        const lineItems = cart.products.map(item => ({
            price_data: {
                currency: "egp",
                product_data: {
                    name: item.productId.name,
                    description: item.productId.description,
                    images: [item.productId.mainImage],
                },
                unit_amount: Math.round(item.productId.price * 100), // Stripe uses the smallest currency unit (cents)
            },
            quantity: item.quantity,
        }));

        // Create Stripe Checkout Session
        session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
            metadata: {
                orderId: order._id.toString(),
            },
        });
    }

    // Save the order after Stripe session is created (if card payment)
    const savedOrder = await order.save();

    // Clear the cart
    cart.products = [];
    await cart.save();

    // Respond with the order and session URL if card payment
    return res.status(201).json({ data: savedOrder, url: session?.url || null });
});

const updateOrderToPaid = asyncWrapper(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new AppError(`There is no such a order with this id:${req.params.id}`, 404));
    }
    // update order to paid
    order.isPaid = true;
    order.paidAt = Date.now();
    const updatedOrder = await order.save();
    res.status(200).json({ status: 'success', data: updatedOrder });
});

const updateOrderStatus = asyncWrapper(async (req, res, next) => {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new AppError(`There is no such a order with this id:${req.params.id}`, 404));
    }

    if (status === "delivered") {
        order.status = "delivered";
    } else if (status === "shipped") {
        order.status = "shipped";
    }

    const updatedOrder = await order.save();
    res.status(200).json({ status: 'success', data: updatedOrder });
});

module.exports = { getOrders, getOrder, checkout, updateOrderToPaid, updateOrderStatus }