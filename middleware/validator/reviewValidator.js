const { check } = require('express-validator');
const validation = require("../validation")
const Review = require('../../models/review.model');

exports.createReviewValidator = [
    check('title').optional(),
    check('rating')
        .notEmpty()
        .withMessage('rating value required')
        .isFloat({ min: 1, max: 5 })
        .withMessage('Rating value must be between 1 to 5'),
    check('user').isMongoId().withMessage('Invalid Review id'),
    check('product')
        .isMongoId()
        .withMessage('Invalid Review id')
        .custom((val, { req }) =>
            // Check if logged user create review before
            Review.findOne({ user: req.user._id, product: req.body.product }).then(
                (review) => {
                    console.log(review);
                    if (review) {
                        return Promise.reject(
                            new Error('You already created a review before')
                        );
                    }
                }
            )
        ),
    validation,
];

exports.getReviewValidator = [
    check('id').isMongoId().withMessage('Invalid Review id'),
    validation,
];

exports.updateReviewValidator = [
    check('id')
        .isMongoId()
        .withMessage('Invalid Review id')
        .custom((val, { req }) =>
            // Check review ownership before update
            Review.findById(val).then((review) => {
                if (!review) {
                    return Promise.reject(new Error(`There is no review with id ${val}`));
                }

                if (review.user._id.toString() !== req.user._id.toString()) {
                    return Promise.reject(
                        new Error(`Your are not allowed to perform this action`)
                    );
                }
            })
        ),
    validation,
];

exports.deleteReviewValidator = [
    check('id')
        .isMongoId()
        .withMessage('Invalid Review id')
        .custom((val, { req }) => {
            // Check review ownership before update
            if (req.user.role === 'user') {
                return Review.findById(val).then((review) => {
                    if (!review) {
                        return Promise.reject(
                            new Error(`There is no review with id ${val}`)
                        );
                    }
                    if (review.user._id.toString() !== req.user._id.toString()) {
                        return Promise.reject(
                            new Error(`Your are not allowed to perform this action`)
                        );
                    }
                });
            }
            return true;
        }),
    validation,
];
