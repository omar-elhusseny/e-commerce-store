const express = require('express');
const router = express.Router();
const { updatePasswordValidation } = require("../middleware/validator/userValidator")
const { getProfile, updateProfile, logout, deleteUser, addAddress, removeAddress, updateAddress, deactivateUser, updatePassword } = require("../controllers/users.controller");
const { uploadSingleImage, setUploadType } = require("../config/multer")
const wishlistRoute = require("../routes/wishlist.route");

router.use('/:id/wishlist', wishlistRoute);

// POST /api/v1/users/logout
router.post("/logout", logout)

// /api/v1/users/profile
router.route("/profile").get(getProfile)

// /api/v1/users/:id - (update user info - delete user)
router.route("/:id")
    .put(setUploadType("users"), uploadSingleImage("profilePicture"), updateProfile)
    .delete(deleteUser)

// /api/v1/users/addresses - (add address)
router.route("/addresses")
    .post(addAddress);

// /api/v1/users/addresses/:addressId - (update address - delete address)
router.route("/addresses/:addressId")
    .put(updateAddress)
    .delete(removeAddress)

// /api/v1/users/:id/deactivate
router.put("/:id/deactivate", deactivateUser);

// /api/v1/users/:id/password
router.put("/:id/password", updatePasswordValidation, updatePassword);


module.exports = router;