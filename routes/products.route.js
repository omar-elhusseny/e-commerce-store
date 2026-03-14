const express = require('express');
const router = express.Router();
const reviewsRoute = require("./review.route");
const { createProductValidator, updateProductValidator, getProductValidator, deleteProductValidator } = require("../middleware/validator/productValidator");
const { getProducts, getProduct, addProduct, updateProduct, deleteProduct } = require("../controllers/products.controller");
// const { uploadMultipleImages, setUploadType } = require("../config/multer");
const { uploadMultipleImages, setUploadType} = require("../config/cloudinary")
const { allowedTo } = require("../middleware/allowTo");
const isAuth = require("../middleware/isAuth");


const uploadImages = uploadMultipleImages([
    { name: "mainImage", maxCount: 1 },
    { name: "images", maxCount: 5 }
])

// POST   /products/jkshjhsdjh2332n/reviews
// GET    /products/jkshjhsdjh2332n/reviews
// GET    /products/jkshjhsdjh2332n/reviews/87487sfww3
router.use('/:id/reviews', isAuth, reviewsRoute);

// /api/v1/products - (get all products - add product)
router.route("/")
    .get(getProducts)
    .post(isAuth, allowedTo, setUploadType("products"), uploadImages, createProductValidator, addProduct)

// /api/v1/products/:id - (get produt - update product - delete product)
router.route("/:id")
    .get(getProductValidator, getProduct)
    .put(isAuth, allowedTo, setUploadType("products"), uploadImages, updateProductValidator, updateProduct)
    .delete(isAuth, allowedTo, deleteProductValidator, deleteProduct)


module.exports = router;