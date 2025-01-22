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

exports.createReview = helperFunction.create(Review);

exports.updateReview = helperFunction.update(Review);

exports.deleteReview = helperFunction.delete(Review);