import express from 'express';
const router = express.Router();
import reviewsRoute from "./review.route.js";
import { createProductValidator, updateProductValidator, getProductValidator, deleteProductValidator } from "../middleware/validator/productValidator.js";
import { getProducts, getProduct, addProduct, updateProduct, deleteProduct } from "../controllers/products.controller.js";
import { uploadMultipleImages, setUploadType } from "../config/cloudinary.js"
import { allowedTo } from "../middleware/allowTo.js";
import isAuth from "../middleware/isAuth.js";


const uploadImages = uploadMultipleImages([
    { name: "mainImage", maxCount: 1 },
    { name: "images", maxCount: 5 }
])

// /api/v1/products/:productId/reviews - nested routes
// POST   /products/jkshjhsdjh2332n/reviews
// GET    /products/jkshjhsdjh2332n/reviews
// GET    /products/jkshjhsdjh2332n/reviews/87487sfww3
router.use('/:productId/reviews', isAuth, reviewsRoute);

// /api/v1/products - (get all products - add product)
router.route("/")
    .get(getProducts)
    .post(isAuth, allowedTo('admin', 'manager'), setUploadType("products"), uploadImages, createProductValidator, addProduct)

// /api/v1/products/:id - (get produt - update product - delete product)
router.route("/:id")
    .get(getProductValidator, getProduct)
    .put(isAuth, allowedTo('admin', 'manager'), setUploadType("products"), uploadImages, updateProductValidator, updateProduct)
    .delete(isAuth, allowedTo('admin'), deleteProductValidator, deleteProduct)


export default router;