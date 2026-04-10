import { check, body } from "express-validator";
import validation from "../validation.js"
import slugify from "slugify";


const getBrandValidator = [
    check('id').isUUID().withMessage("Invalid id"),
    validation
];

const createBrandValidator = [
    check('name')
        .notEmpty().withMessage("Brand name required")
        .isLength({ min: 3 }).withMessage("Too short name")
        .isLength({ max: 32 }).withMessage("Too long name")
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    validation
]

const updateBrandValidator = [
    check('id').isUUID().withMessage("Invalid id"),
    body("name")
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    validation

]

const deleteBrandValidator = [
    check('id').isUUID().withMessage("Invalid id"),
    validation
]


export { getBrandValidator, createBrandValidator, updateBrandValidator, deleteBrandValidator };