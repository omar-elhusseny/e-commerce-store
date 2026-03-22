const WishList = require("../models/wishlist.model");
const Product = require("../models/product.model");
const asyncWrapper = require("../middleware/asyncWrapper");
const AppError = require("../utils/appError");

const getWishlist = asyncWrapper(async (req, res) => {
    const wishlist = await WishList.find({ userId: req.user._id }).populate("products", "_id name");
    return res.status(200).json({
        message: `Wishlist for ${req.user.username} retrieved successfully`,
        data: wishlist,
    })
})

const addWishlist = asyncWrapper(async (req, res, next) => {
    const { productId } = req.body;

    // Ensure the product exists
    const product = await Product.findById(productId);
    if (!product) {
        return next(new AppError("Product not found", 404))
    }

    // Find the user's wishlist or create a new one
    let wishlist = await WishList.findOne({ userId: req.user._id });

    if (!wishlist) {
        // Create a new wishlist if none exists
        wishlist = new WishList({ userId: req.user._id, products: [] });
    }

    // Check if the product is already in the wishlist
    if (wishlist.products.includes(productId)) {
        return next(new AppError("Product is already in the wishlist", 400));
    }

    // Add the product to the wishlist
    wishlist.products.push(productId);
    await wishlist.save();

    return res.status(200).json({
        message: "Product added to wishlist successfully",
        data: wishlist,
    });
})

const removeFromWishlist = asyncWrapper(async (req, res, next) => {
    const { id } = req.params;
    const wishlist = await WishList.findOne({ userId: req.user.id });
    if (!wishlist) {
        return next(new AppError("Wishlist not found", 404))
    }

    const productIndex = wishlist.products.indexOf(id);
    if (productIndex === -1) {
        return next(new AppError("Product not found in wishlist", 404))
    }

    // Remove the product from the wishlist
    wishlist.products.splice(productIndex, 1);

    await wishlist.save();

    return res.status(200).json({
        message: "Product removed from wishlist successfully",
        data: wishlist,
    })
})

const clearWishlist = asyncWrapper(async (req, res, next) => {
    const wishlist = await WishList.findOne({ userId: req.user._id });
    if (!wishlist) {
        return next(new AppError("Wishlist not found", 404))
    }
    wishlist.products = [];
    await wishlist.save();
    return res.status(200).json({ message: 'Wishlist cleared', wishlist });
})

module.exports = { getWishlist, addWishlist, removeFromWishlist, clearWishlist };