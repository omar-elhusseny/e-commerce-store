import prisma from "../config/prisma.js";
import asyncWrapper from "../middleware/asyncWrapper.js";
import AppError from "../utils/appError.js";
import Stripe from "stripe";

const getStripeClient = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new AppError("Stripe is not configured. Missing STRIPE_SECRET_KEY", 500);
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const webhook = asyncWrapper(async (req, res) => {
    const stripe = getStripeClient();

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

        const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });

        if (!order) return res.status(200).send();

        // Prevent duplicate processing
        if (order.isPaid) return res.status(200).send();

        await prisma.$transaction(async (tx) => {
            const markedPaid = await tx.order.updateMany({
                where: { id: order.id, isPaid: false },
                data: {
                    isPaid: true,
                    paidAt: new Date(),
                    paymentMethod: "card",
                    paymentId: paymentIntent,
                },
            });
            if (!markedPaid.count) return;

            for (const item of order.items) {
                const updated = await tx.product.updateMany({
                    where: { id: item.productId, inventory: { gte: item.quantity } },
                    data: { inventory: { decrement: item.quantity }, sold: { increment: item.quantity } },
                });
                if (!updated.count) {
                    throw new AppError(`Insufficient inventory for product ${item.productId}`, 409);
                }
            }

        });
    }

    res.status(200).send();
});

export { webhook };