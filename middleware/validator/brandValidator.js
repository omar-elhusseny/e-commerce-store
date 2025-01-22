const { check, body } = require("express-validator");
const validation = require("../validation")
const slugify = require("slugify");


const getBrandValidator = [
    check('id').isMongoId().withMessage("Invalid id"),
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
    check('id').isMongoId().withMessage("Invalid id"),
    body("name")
        .custom((val, { req }) => {
            req.body.slug = slugify(val);
            return true;
        }),
    validation

]

const deleteBrandValidator = [
    check('id').isMongoId().withMessage("Invalid id"),
    validation
]


module.exports = { getBrandValidator, createBrandValidator, updateBrandValidator, deleteBrandValidator };