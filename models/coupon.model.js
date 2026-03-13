const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            required: [true, "Coupon name required"],
            unique: true,
            uppercase: true
        },

        expire: {
            type: Date,
            required: [true, "Coupon expire time required"]
        },

        discount: {
            type: Number,
            required: [true, "Coupon discount value required"],
            min: [1, "Discount must be at least 1%"],
            max: [100, "Discount cannot exceed 100%"]
        },

        minOrderValue: {
            type: Number,
            default: 0
        },

        usageLimit: {
            type: Number,
            default: null
        },

        usedCount: {
            type: Number,
            default: 0
        },

        isActive: {
            type: Boolean,
            default: true
        }

    },
    { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);