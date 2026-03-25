const asyncWrapper = require("../middleware/asyncWrapper");
const Review = require("../models/review.model");
const helperFunction = require("./crud.methods");
const AppError = require("../utils/appError");

// Inject product and user into body for nested route support
// POST /api/v1/products/:productId/reviews
exports.setProductAndUser = (req, res, next) => {
    if (!req.body.product) req.body.product = req.params.productId;
    req.body.user = req.user._id; // always from token, never from body
    next();
};

exports.getReviews = helperFunction.getAll(Review, { path: "user product", select: "username name" });

exports.getReview = helperFunction.get(Review, { path: "user product", select: "username name" });

exports.getProductReviews = asyncWrapper(async (req, res, next) => {
    const reviews = await Review.find({ product: req.params.productId })
        .populate({ path: "user", select: "username" });
    return res.status(200).json({ results: reviews.length, data: reviews });
});

exports.createReview = asyncWrapper(async (req, res, next) => {
    const review = await Review.create(req.body);
    // avgRating and totalReviews are updated automatically via reviewSchema.post("save")
    return res.status(201).json({ message: "Review created", data: review });
});

exports.updateReview = asyncWrapper(async (req, res, next) => {
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

exports.deleteReview = asyncWrapper(async (req, res, next) => {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return next(new AppError(`No review found with id ${req.params.id}`, 404));
    // avgRating and totalReviews are updated automatically via reviewSchema.post("findOneAndDelete")
    return res.status(204).send();
});