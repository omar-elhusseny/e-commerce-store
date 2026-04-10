import express from "express"
const router = express.Router();
import { createBrandValidator, getBrandValidator, updateBrandValidator, deleteBrandValidator } from "../middleware/validator/brandValidator.js";
import { getBrands, getBrand, createBrand, updateBrand, deleteBrand } from "../controllers/brand.controller.js";
import { uploadSingleImage, setUploadType } from "../config/cloudinary.js";
import { allowedTo } from "../middleware/allowTo.js";
import isAuth from "../middleware/isAuth.js";

// /api/v1/brands - public GET, protected POST
router.route("/")
    .get(getBrands)
    .post(isAuth, allowedTo('admin', 'manager'), setUploadType("brands"), uploadSingleImage('image'), createBrandValidator, createBrand)

// /api/v1/brands/:id - public GET, protected PUT/DELETE
router.route("/:id")
    .get(getBrandValidator, getBrand)
    .put(isAuth, allowedTo('admin', 'manager'), setUploadType("brands"), uploadSingleImage('image'), updateBrandValidator, updateBrand)
    .delete(isAuth, allowedTo('admin'), deleteBrandValidator, deleteBrand);

export default router;
