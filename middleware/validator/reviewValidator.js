import { check, body } from 'express-validator';
import validation from "../validation.js";
import prisma from '../../config/prisma.js';

export const createReviewValidator = [
    check('product').notEmpty().withMessage('Product ID is required').isUUID().withMessage('Invalid product ID').custom(async (val, { req }) => {
        const review = await prisma.review.findFirst({ where: { userId: req.user.id, productId: val } });
        if (review) return Promise.reject(new Error('You already reviewed this product'));
    }),
    check('rating').notEmpty().withMessage('Rating is required').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    check('title').optional().isString().withMessage('Title must be a string'),
    validation,
];

export const getReviewValidator = [check('id').isUUID().withMessage('Invalid review ID'), validation];

export const updateReviewValidator = [
    check('id').isUUID().withMessage('Invalid review ID').custom(async (val, { req }) => {
        const review = await prisma.review.findUnique({ where: { id: val } });
        if (!review) return Promise.reject(new Error(`No review found with id ${val}`));
        if (review.userId !== req.user.id) return Promise.reject(new Error('You are not allowed to update this review'));
    }),
    body('rating').optional().isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').optional().isString().withMessage('Title must be a string'),
    validation,
];

export const deleteReviewValidator = [
    check('id').isUUID().withMessage('Invalid review ID').custom(async (val, { req }) => {
        const review = await prisma.review.findUnique({ where: { id: val } });
        if (!review) return Promise.reject(new Error(`No review found with id ${val}`));
        if (req.user.role === 'user' && review.userId !== req.user.id) return Promise.reject(new Error('You are not allowed to delete this review'));
    }),
    validation,
];
