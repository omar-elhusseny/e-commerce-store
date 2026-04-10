import slugify from 'slugify';
import { check, body } from 'express-validator';
import prisma from '../../config/prisma.js';
import validation from "../validation.js";

export const createProductValidator = [
    check('name').trim().notEmpty().withMessage('Product name is required').isLength({ min: 3 }).withMessage('Must be at least 3 chars').custom((val, { req }) => { req.body.slug = slugify(val); return true; }),
    check('description').trim().notEmpty().withMessage('Product description is required').isLength({ max: 2000 }).withMessage('Too long description'),
    check('inventory').notEmpty().withMessage('Product inventory is required').isInt({ min: 0 }).withMessage('Inventory must be a positive integer'),
    check('sold').optional().isInt({ min: 0 }).withMessage('Sold must be a positive integer'),
    check('price').notEmpty().withMessage('Product price is required').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    check('priceAfterDiscount').optional().isFloat({ min: 0 }).withMessage('Discount price must be a number').custom((value, { req }) => {
        if (value >= req.body.price) throw new Error('Discount price must be lower than original price');
        return true;
    }),
    check('colors').optional().isArray().withMessage('Colors must be an array'),
    check('mainImage').custom((_, { req }) => { if (!req.files?.mainImage?.length) throw new Error('Main image is required'); return true; }),
    check('images').optional().custom((_, { req }) => { if (req.files?.images && !Array.isArray(req.files.images)) throw new Error('Images must be an array'); return true; }),
    check('category').notEmpty().withMessage('Category is required').isUUID().withMessage('Invalid category ID').custom(async (categoryId) => {
        const category = await prisma.category.findUnique({ where: { id: categoryId } });
        if (!category) throw new Error('Category not found');
    }),
    check('subcategory').optional().custom(async (value, { req }) => {
        const ids = Array.isArray(value) ? value : [value];
        const subcategories = await prisma.subCategory.findMany({ where: { id: { in: ids } } });
        if (subcategories.length !== ids.length) throw new Error('Some subcategories not found');
        const isBelong = subcategories.every((sub) => sub.categoryId === req.body.category);
        if (!isBelong) throw new Error('Subcategories do not belong to the selected category');
        return true;
    }),
    check('brand').optional().isUUID().withMessage('Invalid brand ID'),
    validation,
];

export const getProductValidator = [check('id').isUUID().withMessage('Invalid id'), validation];
export const updateProductValidator = [check('id').isUUID().withMessage('Invalid id'), body('name').custom((val, { req }) => { if (val) req.body.slug = slugify(val); return true; }), validation];
export const deleteProductValidator = [check('id').isUUID().withMessage('Invalid ID'), validation];
