const { check, body } = require("express-validator");
const slugify = require('slugify');
const validation = require("../validation")


const getSubCategoryValidator = [
    check('id').isMongoId().withMessage("Invalid Id"),
    validation
];

const createSubCategoryValidator = [
    check('name')
        .notEmpty()
        .withMessage('SubCategory name required')
        .isLength({ min: 2 })
        .withMessage('Too short Subcategory name')
        .isLength({ max: 32 })
        .withMessage('Too long Subcategory name')
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    check('category')
        .notEmpty()
        .withMessage('Subcategory must has main category')
        .isMongoId()
        .withMessage('Invalid Category id'),
    validation
]

const updateSubCategoryValidator = [
    check('id').isMongoId().withMessage("Invalid id"),
    body('name')
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    validation
]

const deleteSubCategoryValidator = [
    check('id').isMongoId().withMessage("Invalid id"),
    validation
]


module.exports = { getSubCategoryValidator, createSubCategoryValidator, updateSubCategoryValidator, deleteSubCategoryValidator };