const express = require('express');
const router = express.Router({ mergeParams: true });
const { getReviews, getReview, createReview, updateReview, editRequestBody, deleteReview, getProductReviews } = require("../controllers/reviews.controller");
const { getReviewValidator, createReviewValidator, updateReviewValidator, deleteReviewValidator } = require("../middleware/validator/reviewValidator");

router.route('/')
    .get(getReviews)
    .post(editRequestBody, createReviewValidator, createReview);

router.route('/:id')
    .get(getReviewValidator, getReview)
    .put(updateReviewValidator, updateReview)
    .delete(deleteReview, deleteReviewValidator);

router.route("/product/:id").get(getReviewValidator, getProductReviews)

module.exports = router;