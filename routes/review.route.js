const express = require('express');
const router = express.Router({ mergeParams: true });
const {
    getReviews,
    getReview,
    createReview,
    updateReview,
    deleteReview,
    setProductAndUser,
    getProductReviews,
} = require("../controllers/reviews.controller");
const {
    getReviewValidator,
    createReviewValidator,
    updateReviewValidator,
    deleteReviewValidator,
} = require("../middleware/validator/reviewValidator");

// Root reviews endpoint:
// - /api/v1/reviews                        => GET all reviews, POST create review
// - /api/v1/products/:productId/reviews    => GET reviews for a product, POST create for that product
router.route('/')
    .get((req, res, next) => (req.params.productId ? getProductReviews(req, res, next) : getReviews(req, res, next)))
    .post(setProductAndUser, createReviewValidator, createReview);

// GET /api/v1/reviews/:id      — get single review
// PUT /api/v1/reviews/:id      — update review (owner only)
// DELETE /api/v1/reviews/:id   — delete review (owner or admin)
router.route('/:id')
    .get(getReviewValidator, getReview)
    .put(updateReviewValidator, updateReview)
    .delete(deleteReviewValidator, deleteReview);

module.exports = router;