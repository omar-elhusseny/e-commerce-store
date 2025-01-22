const Product = require("../models/product.model");
const Order = require("../models/order.model");
const asyncWrapper = require("../middleware/asyncWrapper");

const webhook = asyncWrapper(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        const orderId = session.metadata.orderId;
        const paymentIntent = session.payment_intent;

        // Mark the order as paid
        const order = await Order.findById(orderId);
        if (order) {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentDetails = {
                id: paymentIntent
            };

            // Update stock and sold counts
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
    }
    res.status(200).send()
});

module.exports = { webhook }