const asyncWrapper = require("../middleware/asyncWrapper");
const Review = require("../models/review.model");
const Product = require("../models/product.model");
const helperFunction = require("./crud.methods");
const AppError = require("../utils/appError");

// Inject product and user into body for nested route support
// POST /api/v1/products/:productId/reviews
const setProductAndUser = (req, res, next) => {
    const nestedProductId = req.params.productId;
    req.body = req.body || {};
    if (!req.body.product && nestedProductId) req.body.product = nestedProductId;
    req.body.user = req.user._id; // always from token, never from body
    next();
};

const getReviews = helperFunction.getAll(Review, { path: "user product", select: "username name" });

const getReview = helperFunction.get(Review, { path: "user product", select: "username name" });

const getProductReviews = asyncWrapper(async (req, res, next) => {
    const productId = req.params.productId;

    // Ensure the parent product exists; otherwise a "no reviews" response can
    // be misleading (empty list vs invalid product id).
    if (!productId) return next(new AppError('Product id is required', 400));

    // Validate ObjectId shape to avoid Mongoose cast errors.
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return next(new AppError(`Invalid product ID: ${productId}`, 400));
    }

    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
        return next(new AppError(`No product found with id ${productId}`, 404));
    }

    const reviews = await Review.find({ product: productId })
        .populate({ path: "user", select: "username" });
    return res.status(200).json({ results: reviews.length, data: reviews });
});

const createReview = asyncWrapper(async (req, res, next) => {
    const productId = req.params.productId || req.body.product;

    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
        return next(new AppError(`No product found with id ${productId}`, 404));
    }
    // Verify the user has actually purchased and received this product
    const Order = require('../models/order.model');
    const hasPurchased = await Order.exists({
        userId: req.user._id,
        'orderItems.productId': req.body.product,
        isPaid: true,
        status: 'delivered',
    });

    if (!hasPurchased) {
        return next(new AppError('You can only review products you have purchased and received.', 403));
    }

    const review = await Review.create(req.body);
    return res.status(201).json({ message: "Review created", data: review });
});

const updateReview = asyncWrapper(async (req, res, next) => {
    // Only allow updating title and rating — not user or product
    const { title, rating } = req.body;
    const updateData = {
        ...(title !== undefined && { title }),
        ...(rating !== undefined && { rating }),
    };

    const review = await Review.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!review) return next(new AppError(`No review found with id ${req.params.id}`, 404));

    // Manually trigger recalculation since findByIdAndUpdate doesn't fire post("save")
    await Review.calcRatings(review.product);

    return res.status(200).json({ data: review });
});

const deleteReview = asyncWrapper(async (req, res, next) => {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return next(new AppError(`No review found with id ${req.params.id}`, 404));
    // avgRating and totalReviews are updated automatically via reviewSchema.post("findOneAndDelete")
    return res.status(204).send();
});

module.exports = {
    setProductAndUser,
    getReviews,
    getReview,
    getProductReviews,
    createReview,
    updateReview,
    deleteReview
};