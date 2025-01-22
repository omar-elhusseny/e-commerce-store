const express = require("express")
const router = express.Router();
const { createBrandValidator, getBrandValidator, updateBrandValidator, deleteBrandValidator } = require("../middleware/validator/brandValidator");
const { getBrands, getBrand, createBrand, updateBrand, deleteBrand } = require("../controllers/brand.controller");
const { uploadSingleImage, setUploadType } = require("../config/multer")
const { allowedTo } = require("../middleware/allowTo");


// /api/v1/brands - (get all brands - add brand)
router.route("/")
    .get(getBrands)
    .post(setUploadType("brands"), uploadSingleImage('image'), createBrandValidator, createBrand)

// /api/v1/brands/:i - (get brand - update brand - delete brand)
router.route("/:id")
    .get(getBrandValidator, getBrand)
    .put(allowedTo, setUploadType("brands"), uploadSingleImage('image'), updateBrandValidator, updateBrand)
    .delete(allowedTo, deleteBrandValidator, deleteBrand);

module.exports = router;
