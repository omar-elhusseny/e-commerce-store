const express = require('express');
const router = express.Router();
const { updatePasswordValidation, updateProfileValidation } = require("../middleware/validator/userValidator")
const { getProfile, updateProfile, logout, deleteUser, addAddress, removeAddress, updateAddress, deactivateUser, changePassword } = require("../controllers/users.controller");
const { uploadSingleImage, setUploadType } = require("../config/cloudinary")
const wishlistRoute = require("../routes/wishlist.route");
const AppError = require("../utils/appError");

router.use('/:id/wishlist', wishlistRoute);

// POST /api/v1/users/logout
router.post("/logout", logout)

// /api/v1/users/profile
router.route("/profile").get(getProfile)

// /api/v1/users/:id - (update user info - delete user)
// Guard: users can only update/delete their own account
const isSelf = (req, res, next) => {
    if (req.user._id.toString() !== req.params.id)
        return next(new AppError("You are not allowed to modify another user's account", 403));
    next();
};

router.route("/:id")
    .put(isSelf, updateProfileValidation, setUploadType("users"), uploadSingleImage("profilePicture"), updateProfile)
    .delete(isSelf, deleteUser)

// /api/v1/users/addresses - (add address)
router.route("/addresses")
    .post(addAddress);

// /api/v1/users/addresses/:addressId - (update address - delete address)
router.route("/addresses/:addressId")
    .put(updateAddress)
    .delete(removeAddress)

// /api/v1/users/:id/deactivate
router.put("/:id/deactivate", deactivateUser);

// PATCH /api/v1/users/:id/change-password
router.patch("/:id/change-password", updatePasswordValidation, changePassword);


module.exports = router;