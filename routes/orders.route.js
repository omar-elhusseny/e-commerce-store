const express = require('express');
const router = express.Router();
const { getOrders, getOrder, checkout, updateOrderToPaid, updateOrderStatus, cancelOrder } = require('../controllers/orders.controller');
const { createOrderValidation, updatedOrderValidation, getOrderValidation } = require("../middleware/validator/orderValidation")
const { allowedTo } = require("../middleware/allowTo");

// /api/v1/orders
router.route("/")
    .get(getOrders)
    .post(createOrderValidation, checkout)

// /api/v1/orders/:id
router.route('/:id')
    .get(getOrderValidation, getOrder)

// /api/v1/orders/:id/pay — admin/manager only
router.put('/:id/pay', allowedTo('admin', 'manager'), updateOrderToPaid);

// /api/v1/orders/:id/status — admin/manager only
router.patch("/:id/status", allowedTo('admin', 'manager'), updatedOrderValidation, updateOrderStatus)

// /api/v1/orders/:id/cancel — any authenticated user (ownership checked in controller)
router.patch('/:id/cancel', cancelOrder);

module.exports = router;