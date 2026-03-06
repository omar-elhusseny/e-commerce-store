const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        minLength: [3, "Too short product name"],
        maxLength: [100, "Too long product name"],
    },
    slug: {
        type: String,
        required: true,
        lowercase: true
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Product description is required'],
        minLength: [20, "Too short product description"],
    },
    quantity: {
        type: Number,
        required: [true, 'Product quantity is required'],
    },
    sold: {
        type: Number,
        default: 0,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: [true, 'Product category is required']
    },
    subcategory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subcategory",
    }],
    priceAfterDiscount: {
        type: String
    },
    colors: [String],
    mainImage: {
        type: String,
        required: [true, 'Product main image is required']
    },
    images: [String],
    brand: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Brand",
    },
    avgRating: {
        type: Number,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0,
    }
}, { timestamps: true });

// Indexing the name and description fields for full-text search
productSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model('Product', productSchema);