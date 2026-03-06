const slugify = require('slugify');
const { check, body } = require('express-validator');
const Category = require('../../models/category.model');
const Subcategory = require('../../models/subCategory.model');
const validation = require("../validation")

exports.createProductValidator = [
    check('name')
        .isLength({ min: 3 })
        .withMessage('must be at least 3 chars')
        .notEmpty()
        .withMessage('Product required')
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    check('description')
        .notEmpty()
        .withMessage('Product description is required')
        .isLength({ max: 2000 })
        .withMessage('Too long description'),
    check('quantity')
        .notEmpty()
        .withMessage('Product quantity is required')
        .isNumeric()
        .withMessage('Product quantity must be a number'),
    check('sold')
        .optional()
        .isNumeric()
        .withMessage('Product quantity must be a number'),
    check('price')
        .notEmpty()
        .withMessage('Product price is required')
        .isNumeric()
        .withMessage('Product price must be a number')
        .isLength({ max: 32 })
        .withMessage('To long price'),
    check('priceAfterDiscount')
        .optional()
        .isNumeric()
        .withMessage('Product price after discount must be a number')
        .toFloat()
        .custom((value, { req }) => {
            if (req.body.price <= value) {
                throw new Error('price after discount must be lower than price');
            }
            return true;
        }),

    check('colors')
        .optional()
        .isArray()
        .withMessage('colors should be array of string'),
    check('mainImage')
        .custom((value, { req }) => {
            if (!req.files?.mainImage || req.files.mainImage.length === 0) {
                throw new Error('Product main image is required');
            }
            return true;
        }),
    check('images')
        .optional()
        .isArray()
        .withMessage('images should be array of string')
        .custom((value, { req }) => {
            if (req.files?.images && !Array.isArray(req.files.images)) {
                throw new Error('Images should be an array of files');
            }
            return true;
        }),
    check('category')
        .notEmpty()
        .withMessage('Product must be belong to a category')
        .isMongoId()
        .withMessage('Invalid id')
        .custom((categoryId) =>
            Category.findById(categoryId).then((category) => {
                if (!category) {
                    return Promise.reject(new Error(`No category for this id: ${categoryId}`));
                }
            })
        ),

    check('subcategory')
        .optional()
        .isMongoId()
        .withMessage('Invalid ID formate')
        .custom((subcategoriesIds) =>
            Subcategory.find({ _id: { $exists: true, $in: subcategoriesIds } }).then(
                (result) => {
                    if (result.length < 1 || result.length !== subcategoriesIds.length) {
                        return Promise.reject(new Error(`Invalid subcategories Ids`));
                    }
                }
            )
        )
        .custom((val, { req }) =>
            Subcategory.find({ category: req.body.category }).then(
                (subcategories) => {
                    // Initialize an empty array to hold the IDs of subcategories found in the database
                    const subCategoriesIdsInDB = [];

                    // Loop through all the subcategories retrieved from the database
                    subcategories.forEach((Subcategory) => {
                        // Push the stringified ID of each subcategory to the array
                        subCategoriesIdsInDB.push(Subcategory._id.toString());
                    });

                    // Check if each value in the provided array 'val' (which likely contains subcategory IDs) exists in the 'subCategoriesIdsInDB' array
                    const isBelong = val.every((v) => subCategoriesIdsInDB.includes(v));
                    // If any of the provided subcategory IDs don't belong to the category, reject the promise with an error message
                    if (!isBelong) {
                        return Promise.reject(new Error(`subcategories not belong to category`));
                    }
                }
            )
        ),

    check('brand').optional().isMongoId().withMessage('Invalid ID'),
    // check('rating')
    //     .optional()
    //     .isNumeric()
    //     .withMessage('rating must be a number')
    //     .isLength({ min: 1 })
    //     .withMessage('Rating must be above or equal 1.0')
    //     .isLength({ max: 5 })
    //     .withMessage('Rating must be below or equal 5.0'),
    // check('ratingQuantity')
    //     .optional()
    //     .isNumeric()
    //     .withMessage('rating quantity must be a number'),
    validation
];

exports.getProductValidator = [
    check('id').isMongoId().withMessage('Invalid id'),
    validation
];

exports.updateProductValidator = [
    check('id').isMongoId().withMessage('Invalid id'),
    body('name')
        .custom((val, { req }) => {
            if(val) req.body.slug = slugify(val);
            return true;
        }),
    validation
];

exports.deleteProductValidator = [
    check('id').isMongoId().withMessage('Invalid ID'),
    validation
];
