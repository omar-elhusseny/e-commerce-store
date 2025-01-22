const { check, body } = require("express-validator");
const slugify = require('slugify');
const validation = require("../validation")


const getCategoryValidator = [
    check('id').isMongoId().withMessage("Invalid id"),
    validation
];

const createCategoryValidator = [
    check('name')
        .notEmpty()
        .withMessage('Category required')
        .isLength({ min: 3 })
        .withMessage('Too short category name')
        .isLength({ max: 32 })
        .withMessage('Too long category name')
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    validation
]

const updateCategoryValidator = [
    check('id').isMongoId().withMessage('Invalid category id'),
    body('name')
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    validation
]

const deleteCategoryValidator = [
    check('id').isMongoId().withMessage("Invalid id"),
    validation
]


module.exports = { getCategoryValidator, createCategoryValidator, updateCategoryValidator, deleteCategoryValidator };