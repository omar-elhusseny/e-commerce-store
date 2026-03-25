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
    getProductReviewsValidator,
} = require("../middleware/validator/reviewValidator");

// GET /api/v1/reviews — all reviews (admin)
// POST /api/v1/reviews — create review
// POST /api/v1/products/:productId/reviews — create review via nested route
router.route('/')
    .get(getReviews)
    .post(setProductAndUser, createReviewValidator, createReview);

// GET /api/v1/reviews/:id — get single review
// PUT /api/v1/reviews/:id — update review (owner only)
// DELETE /api/v1/reviews/:id — delete review (owner or admin)
router.route('/:id')
    .get(getReviewValidator, getReview)
    .put(updateReviewValidator, updateReview)
    .delete(deleteReviewValidator, deleteReview);

// GET /api/v1/products/:productId/reviews — get all reviews for a product (nested route)
router.route('/product/:productId')
    .get(getProductReviewsValidator, getProductReviews);

module.exports = router;