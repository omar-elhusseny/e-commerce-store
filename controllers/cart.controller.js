const Cart = require('../models/cart.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const asyncWrapper = require("../middleware/asyncWrapper");
const AppError = require("../utils/appError");
const Coupon = require("../models/coupon.model");


const addToCart = asyncWrapper(async (req, res, next) => {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) return next(new AppError("Product not found", 404));

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        console.log("no cart")
        cart = new Cart({ user: req.user._id, products: [{ productId, quantity }] });
    } else {
        const existingItem = cart.products.find((item) => item.productId.toString() === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.products.push({ productId, quantity });
        }
    }

    cart.totalPrice += (product.price * quantity);
    await cart.save();
    return res.status(200).json({ message: 'Item added/updated successfully', cart });
})

const getUserCart = asyncWrapper(async (req, res, next) => {
    const cart = await Cart.findOne({ user: req.user._id }).populate("products.productId", "_id name");
    if (!cart) next(new AppError("Cart is empty or not found", 404));
    return res.status(200).json({ message: "Cart retrieved successfuly", data: cart });
});

const updateCart = asyncWrapper(async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;

    // Populate the product details in the cart
    const cart = await Cart.findOne({ user: req.user._id }).populate('products.productId');
    if (!cart) {
        return res.status(404).json({ message: 'Cart not found' });
    }

    // Find the product in the cart
    const productIndex = cart.products.findIndex(item => item.productId._id.toString() === productId);
    if (productIndex === -1) {
        return res.status(404).json({ message: 'Item not found in cart' });
    }

    // Update the product quantity
    cart.products[productIndex].quantity = quantity;

    // Recalculate the total price
    cart.totalPrice = cart.products.reduce((total, item) => {
        return total + item.productId.price * item.quantity;
    }, 0);

    // Save the updated cart
    await cart.save();

    return res.status(200).json({ message: 'Cart updated successfully', cart });
});

const deleteFromCart = async (req, res) => {
    const productId = req.params.id; // productId to be deleted
    const user = await User.findOne({ email: req.user.email });

    try {
        const product = await Product.findById(productId);
        const cart = await Cart.findOne({ user: user._id });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Remove the item with the specified ID
        const productIndex = cart.products.findIndex(item => item.productId.toString() === productId);

        if (productIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        cart.products.splice(productIndex, 1);  // Remove the item
        cart.totalPrice -= product.price;
        await cart.save();

        return res.status(200).json({ message: 'Item removed from cart', cart });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing item from cart' });
    }
};

const applyCoupon = asyncWrapper(async (req, res, next) => {
    // 1) Get coupon based on coupon name
    const coupon = await Coupon.findOne({
        name: req.body.coupon,
        expire: { $gt: Date.now() },
    });

    if (!coupon) {
        return next(new AppError(`Coupon is invalid or expired`));
    }

    // 2) Get logged user cart to get total cart price
    const cart = await Cart.findOne({ user: req.user._id });

    const totalPrice = cart.totalPrice;

    // 3) Calculate price after priceAfterDiscount
    const totalPriceAfterDiscount = (totalPrice - totalPrice * (coupon.discount / 100)).toFixed(2); // 99.23

    // 4) Update the totalPriceAfterDiscount in the cart
    cart.totalPriceAfterDiscount = totalPriceAfterDiscount;
    await cart.save();

    return res.status(200).json({ data: cart });
});

module.exports = { addToCart, getUserCart, deleteFromCart, updateCart, applyCoupon };