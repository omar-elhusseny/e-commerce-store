const express = require('express');
const router = express.Router();
const { addToCart, getUserCart, deleteFromCart, updateCart, applyCoupon } = require("../controllers/cart.controller");
const { updateCartValidator, deleteCartValidator, addCartValidator } = require("../middleware/validator/cartValidator");

// /api/v1/cart - (get cart - add to cart)
router.route("/")
    .get(getUserCart)
    .post(addCartValidator, addToCart)

// /api/v1/cart/applyCoupon
router.put('/applyCoupon', applyCoupon);

// /api/v1/cart/:productId - (update cart - delete item from cart)
router.route("/:productId")
    .put(updateCartValidator, updateCart)
    .delete(deleteCartValidator, deleteFromCart)

module.exports = router;