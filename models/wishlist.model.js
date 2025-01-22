
const mongoose = require("mongoose");

const wishListSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    }]
}, { timestamps: true });

module.exports = mongoose.model("WishList", wishListSchema);