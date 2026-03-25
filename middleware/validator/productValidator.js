const slugify = require('slugify');
const { check, body } = require('express-validator');
const Category = require('../../models/category.model');
const Subcategory = require('../../models/subCategory.model');
const validation = require("../validation")

exports.createProductValidator = [
    // 1. Name
    check('name')
        .trim()
        .notEmpty().withMessage('Product name is required')
        .isLength({ min: 3 }).withMessage('Must be at least 3 chars')
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),

    // 2. Description
    check('description')
        .trim()
        .notEmpty().withMessage('Product description is required')
        .isLength({ max: 2000 }).withMessage('Too long description'),

    // 3. Inventory
    check('inventory')
        .notEmpty().withMessage('Product inventory is required')
        .isInt({ min: 0 }).withMessage('Inventory must be a positive integer'),

    // 4. Sold
    check('sold')
        .optional()
        .isInt({ min: 0 }).withMessage('Sold must be a positive integer'),

    // 5. Price
    check('price')
        .notEmpty().withMessage('Product price is required')
        .isFloat({ min: 0 }).withMessage('Price must be a positive number'),

    // 6. Price After Discount
    check('priceAfterDiscount')
        .optional()
        .isFloat({ min: 0 }).withMessage('Discount price must be a number')
        .custom((value, { req }) => {
            if (value >= req.body.price) {
                throw new Error('Discount price must be lower than original price');
            }
            return true;
        }),

    // 7. Colors
    check('colors')
        .optional()
        .isArray().withMessage('Colors must be an array'),

    // 8. Main Image
    check('mainImage').custom((_, { req }) => {
        if (!req.files?.mainImage?.length) {
            throw new Error('Main image is required');
        }
        return true;
    }),

    // 9. Images
    check('images')
        .optional()
        .custom((_, { req }) => {
            if (req.files?.images && !Array.isArray(req.files.images)) {
                throw new Error('Images must be an array');
            }
            return true;
        }),

    // 10. Category
    check('category')
        .notEmpty().withMessage('Category is required')
        .isMongoId().withMessage('Invalid category ID')
        .custom(async (categoryId) => {
            const category = await Category.findById(categoryId);
            if (!category) {
                throw new Error('Category not found');
            }
        }),

    // 11. Subcategories
    check('subcategory')
        .optional()
        .custom(async (value, { req }) => {
            const ids = Array.isArray(value) ? value : [value];

            // Validate format
            const isValid = ids.every(id => /^[a-fA-F0-9]{24}$/.test(id));
            if (!isValid) throw new Error('Invalid subcategory ID format');

            // Fetch from DB
            const subcategories = await Subcategory.find({ _id: { $in: ids } });

            if (subcategories.length !== ids.length) {
                throw new Error('Some subcategories not found');
            }

            // Check relation with category
            const isBelong = subcategories.every(
                sub => sub.category.toString() === req.body.category
            );

            if (!isBelong) {
                throw new Error('Subcategories do not belong to the selected category');
            }

            return true;
        }),

    // 12. Brand
    check('brand')
        .optional()
        .isMongoId().withMessage('Invalid brand ID'),
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
            if (val) req.body.slug = slugify(val);
            return true;
        }),
    validation
];

exports.deleteProductValidator = [
    check('id').isMongoId().withMessage('Invalid ID'),
    validation
];