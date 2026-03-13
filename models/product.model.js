const mongoose = require("mongoose");
const clearModelCache = require("../utils/clearCache");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
            minLength: [3, "Too short product name"],
            maxLength: [100, "Too long product name"],
        },

        slug: {
            type: String,
            required: true,
            lowercase: true,
            index: true
        },

        price: {
            type: Number,
            required: [true, "Product price is required"],
            min: [0, "Price cannot be negative"]
        },

        priceAfterDiscount: {
            type: Number,
            min: 0
        },

        description: {
            type: String,
            required: [true, "Product description is required"],
            minLength: [20, "Too short product description"],
        },

        inventory: {
            type: Number,
            required: [true, "Product stock is required"],
            min: [0, "Stock cannot be negative"],
            default: 0
        },

        sold: {
            type: Number,
            default: 0,
            min: 0
        },

        isActive: {
            type: Boolean,
            default: true
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: [true, "Product category is required"]
        },

        subcategory: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subcategory",
        }],

        colors: [String],

        mainImage: {
            type: String,
            required: [true, "Product main image is required"]
        },

        images: [String],

        brand: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Brand",
        },

        avgRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        totalReviews: {
            type: Number,
            default: 0,
            min: 0
        }

    },
    { timestamps: true }
);

// Full-text search
productSchema.index({ name: "text", description: "text" });

productSchema.post("save", async function () {
    await clearModelCache(this.constructor.collection.name);
})

productSchema.post("findOneAndUpdate", async function () {
    await clearModelCache(this.model.collection.name);
});

productSchema.post("findOneAndDelete", async function () {
    await clearModelCache(this.model.collection.name);
});

module.exports = mongoose.model("Product", productSchema);
