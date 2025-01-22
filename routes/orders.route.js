const express = require('express');
const router = express.Router();
const { getOrders, getOrder, checkout, webhook, updateOrderToPaid, updateOrderStatus } = require('../controllers/orders.controller');
const { createOrderValidation, updatedOrderValidation, getOrderValidation } = require("../middleware/validator/orderValidation")
const { allowedTo } = require("../middleware/allowTo");

// /api/v1/orders
router.route("/")
    .get(getOrders)
    .post(createOrderValidation, checkout)

// /api/v1/orders/:id
router.route('/:id').get(getOrderValidation, getOrder).put(allowedTo, updatedOrderValidation, updateOrderStatus)

// /api/v1/orders/:id/pay
router.put('/:id/pay', allowedTo, updateOrderToPaid);

module.exports = router;