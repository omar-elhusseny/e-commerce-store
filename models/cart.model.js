const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: [true, "Product is required"],
        },

        quantity: {
            type: Number,
            required: [true, "Quantity is required"],
            min: [1, "Quantity must be at least 1"],
            default: 1,
        },
    },
    { _id: false }
);

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"],
            unique: true, // one cart per user
            index: true,
        },

        products: [cartItemSchema],

        totalPrice: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalPriceAfterDiscount: {
            type: Number,
            default: 0,
            min: 0,
        },
        coupon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Coupon",
            default: null
        }
    },
    { timestamps: true }
);

cartSchema.index({ user: 1, "products.productId": 1 });

module.exports = mongoose.model("Cart", cartSchema);
