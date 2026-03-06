const asyncWrapper = require("../middleware/asyncWrapper");
const Product = require("../models/product.model");
const Review = require("../models/review.model");
const helperFunction = require("./crud.methods")

// Nested route (Create)
exports.editRequestBody = (req, res, next) => {
    // if the params have id, we use the nested route to add subcategory, if null, we use the original route to add it
    if (!req.body.product) req.body.product = req.params.productId;
    if (!req.body.user) req.body.user = req.user._id;
    next();
}

exports.getReviews = helperFunction.getAll(Review, { path: "user product", select: "username name" })

exports.getReview = helperFunction.get(Review, { path: "user product", select: "username name" });

exports.getProductReviews = asyncWrapper(async (req, res, next) => {
    console.log(req.body.id)
    const productReview = await Review.find({ product: req.params.id }).populate({ path: "user product", select: "username name" });
    return res.status(200).json({ data: productReview })
})

// exports.createReview = helperFunction.create(Review);
exports.createReview = asyncWrapper(async (req, res, next) => {
    const review = await Review.create(req.body);

    let totalRating = 0.0;

    const product = await Product.findOne({ _id: req.body.product })
    const productReviews = await Review.find({ product: req.body.product });

    productReviews.forEach(review => {
        totalRating += review.rating;
    })

    product.totalReviews += 1;

    product.avgRating = totalRating / product.totalReviews;

    await product.save();

    return res.status(201).json({ message: "Review created" })
})

exports.updateReview = helperFunction.update(Review);

exports.deleteReview = helperFunction.delete(Review);