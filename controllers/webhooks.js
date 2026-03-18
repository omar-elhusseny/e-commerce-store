const Product = require("../models/product.model");
const Order = require("../models/order.model");
const asyncWrapper = require("../middleware/asyncWrapper");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const webhook = asyncWrapper(async (req, res) => {

    const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {

        const session = event.data.object;
        const orderId = session.metadata.orderId;
        const paymentIntent = session.payment_intent;

        const order = await Order.findById(orderId);

        if (!order) return res.status(200).send();

        // Prevent duplicate processing
        if (order.isPaid) return res.status(200).send();

        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentDetails = {
            method: "card",
            id: paymentIntent
        };

        // Update inventory
        for (const item of order.orderItems) {
            const product = await Product.findById(item.productId);

            if (product) {
                product.quantity -= item.quantity;
                product.sold += item.quantity;
                await product.save();
            }
        }

        await order.save();
    }

    res.status(200).send();
});

module.exports = { webhook };