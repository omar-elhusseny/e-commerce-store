const { body, check } = require("express-validator");
const validation = require("../validation")

const createOrderValidation = [
    body("shippingAddress")
        .notEmpty().withMessage("Shipping address is required"),
    validation
]

const updatedOrderValidation = [
    check("id").notEmpty().withMessage("order id is required"),
    body("status").notEmpty().withMessage("status is required"),
    validation
]

const getOrderValidation = [
    check("id").isMongoId().withMessage("Order id is invalid"),
    validation
]

module.exports = { createOrderValidation, updatedOrderValidation, getOrderValidation }