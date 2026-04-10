import express from 'express';
const router = express.Router();
import { updatePasswordValidation, updateProfileValidation } from "../middleware/validator/userValidator.js"
import { getProfile, updateProfile, logout, addAddress, removeAddress, updateAddress, deactivateUser, changePassword, deleteAccount } from "../controllers/users.controller.js";
import { uploadSingleImage, setUploadType } from "../config/cloudinary.js"
import wishlistRoute from "../routes/wishlist.route.js";
import AppError from "../utils/appError.js";

router.use('/:id/wishlist', wishlistRoute);

// POST /api/v1/users/logout
router.post("/logout", logout)

// /api/v1/users/profile
router.route("/profile").get(getProfile)

// /api/v1/users/:id - (update user info - delete user)
// Guard: users can only update/delete their own account
const isSelf = (req, res, next) => {
    if (req.user.id !== req.params.id)
        return next(new AppError("You are not allowed to modify another user's account", 403));
    next();
};

// "/api/v1/users/me"
router.delete("/me", deleteAccount)

router.route("/:id")
    .put(isSelf, updateProfileValidation, setUploadType("users"), uploadSingleImage("profilePicture"), updateProfile)

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


export default router;