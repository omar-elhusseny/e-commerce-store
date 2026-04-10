import { body, check } from "express-validator";
import validation from "../validation.js";

const createOrderValidation = [
    body("shippingAddress")
        .notEmpty().withMessage("Shipping address is required"),
    validation
];

const updatedOrderValidation = [
    check("id").notEmpty().withMessage("order id is required"),
    body("status").notEmpty().withMessage("status is required"),
    validation
];

const getOrderValidation = [
    check("id").isUUID().withMessage("Order id is invalid"),
    validation
];

export { createOrderValidation, updatedOrderValidation, getOrderValidation };