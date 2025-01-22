const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product is required']
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required']
        }
    }],
    totalPrice: {
        type: Number,
        default: 0
    },
    totalPriceAfterDiscount: {
        type: Number,
        default: 0
    },
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);