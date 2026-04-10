import { check, body } from "express-validator";
import slugify from 'slugify';
import validation from "../validation.js"


const getCategoryValidator = [
    check('id').isUUID().withMessage("Invalid id"),
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
    check('id').isUUID().withMessage('Invalid category id'),
    body('name')
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    validation
]

const deleteCategoryValidator = [
    check('id').isUUID().withMessage("Invalid id"),
    validation
]


export { getCategoryValidator, createCategoryValidator, updateCategoryValidator, deleteCategoryValidator };