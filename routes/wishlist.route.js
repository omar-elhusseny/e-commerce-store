const express = require('express');
const router = express.Router({ mergeParams: true });
const { getWishlist, addWishlist, clearWishlist, removeFromWishlist } = require("../controllers/wishlist.controller");
const { addWishlistValidation, removeWishlistValidation } = require("../middleware/validator/wishlistValidator")

// /api/v1/wishlist - (get wishlist - add wishlist)
router.route("/")
    .get(getWishlist)
    .post(addWishlistValidation, addWishlist)

// DELETE /api/v1/wishlist/clear - clear all products in wishlist at once
router.delete("/clear", clearWishlist);

// DELETE /api/v1/wishlist/remove - remove product from wishlist
router.delete("/:id", removeWishlistValidation, removeFromWishlist);

module.exports = router;