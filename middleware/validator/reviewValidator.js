const { check, body } = require('express-validator');
const validation = require("../validation");
const Review = require('../../models/review.model');

exports.createReviewValidator = [
    check('product')
        .notEmpty().withMessage('Product ID is required')
        .isMongoId().withMessage('Invalid product ID')
        .custom((val, { req }) =>
            Review.findOne({ user: req.user._id, product: val }).then((review) => {
                if (review) return Promise.reject(new Error('You already reviewed this product'));
            })
        ),
    check('rating')
        .notEmpty().withMessage('Rating is required')
        .isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    check('title').optional().isString().withMessage('Title must be a string'),
    validation,
];

exports.getReviewValidator = [
    check('id').isMongoId().withMessage('Invalid review ID'),
    validation,
];

exports.getProductReviewsValidator = [
    check('productId').isMongoId().withMessage('Invalid product ID'),
    validation,
];

exports.updateReviewValidator = [
    check('id')
        .isMongoId().withMessage('Invalid review ID')
        .custom((val, { req }) =>
            Review.findById(val).then((review) => {
                if (!review) return Promise.reject(new Error(`No review found with id ${val}`));
                if (review.user._id.toString() !== req.user._id.toString())
                    return Promise.reject(new Error('You are not allowed to update this review'));
            })
        ),
    body('rating')
        .optional()
        .isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').optional().isString().withMessage('Title must be a string'),
    validation,
];

exports.deleteReviewValidator = [
    check('id')
        .isMongoId().withMessage('Invalid review ID')
        .custom((val, { req }) =>
            Review.findById(val).then((review) => {
                if (!review) return Promise.reject(new Error(`No review found with id ${val}`));
                // Admins can delete any review; users can only delete their own
                if (req.user.role === 'user' && review.user._id.toString() !== req.user._id.toString())
                    return Promise.reject(new Error('You are not allowed to delete this review'));
            })
        ),
    validation,
];