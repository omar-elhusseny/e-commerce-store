import express from 'express';
const router = express.Router({ mergeParams: true });
import { getWishlist, addWishlist, clearWishlist, removeFromWishlist } from "../controllers/wishlist.controller.js";
import { addWishlistValidation, removeWishlistValidation } from "../middleware/validator/wishlistValidator.js"

// /api/v1/wishlist - (get wishlist - add wishlist)
router.route("/")
    .get(getWishlist)
    .post(addWishlistValidation, addWishlist)

// DELETE /api/v1/wishlist/clear - clear all products in wishlist at once
router.delete("/clear", clearWishlist);

// DELETE /api/v1/wishlist/:id - remove product from wishlist
router.delete("/:id", removeWishlistValidation, removeFromWishlist);

export default router;