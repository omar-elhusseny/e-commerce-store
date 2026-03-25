const express = require("express")
const router = express.Router();
const { createBrandValidator, getBrandValidator, updateBrandValidator, deleteBrandValidator } = require("../middleware/validator/brandValidator");
const { getBrands, getBrand, createBrand, updateBrand, deleteBrand } = require("../controllers/brand.controller");
const { uploadSingleImage, setUploadType } = require("../config/cloudinary");
const { allowedTo } = require("../middleware/allowTo");
const isAuth = require("../middleware/isAuth");

// /api/v1/brands - public GET, protected POST
router.route("/")
    .get(getBrands)
    .post(isAuth, allowedTo('admin', 'manager'), setUploadType("brands"), uploadSingleImage('image'), createBrandValidator, createBrand)

// /api/v1/brands/:id - public GET, protected PUT/DELETE
router.route("/:id")
    .get(getBrandValidator, getBrand)
    .put(isAuth, allowedTo('admin', 'manager'), setUploadType("brands"), uploadSingleImage('image'), updateBrandValidator, updateBrand)
    .delete(isAuth, allowedTo('admin'), deleteBrandValidator, deleteBrand);

module.exports = router;
