import { check, body } from "express-validator";
import slugify from 'slugify';
import validation from "../validation.js"


const getSubCategoryValidator = [
    check('id').isUUID().withMessage("Invalid Id"),
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
        .isUUID()
        .withMessage('Invalid Category id'),
    validation
]

const updateSubCategoryValidator = [
    check('id').isUUID().withMessage("Invalid id"),
    body('name')
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    validation
]

const deleteSubCategoryValidator = [
    check('id').isUUID().withMessage("Invalid id"),
    validation
]


export { getSubCategoryValidator, createSubCategoryValidator, updateSubCategoryValidator, deleteSubCategoryValidator };