import express from 'express';
const router = express.Router();
import { addToCart, getUserCart, deleteFromCart, updateCart, applyCoupon, removeCoupon, clearCart } from "../controllers/cart.controller.js";
import { updateCartValidator, deleteCartValidator, addCartValidator } from "../middleware/validator/cartValidator.js";

// /api/v1/cart - (get cart - add to cart)
router.route("/")
    .get(getUserCart)
    .post(addCartValidator, addToCart)

// /api/v1/cart/apply-coupon
router.put('/apply-coupon', applyCoupon);

// /api/v1/cart/remove-coupon
router.patch("/remove-coupon", removeCoupon);

// /api/v1/cart/clear-cart
router.delete("/clear-cart", clearCart);

// /api/v1/cart/:productId - (update cart - delete item from cart)
router.route("/:productId")
    .put(updateCartValidator, updateCart)
    .delete(deleteCartValidator, deleteFromCart)

export default router;