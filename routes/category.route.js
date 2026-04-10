import express from "express"
const router = express.Router();
import { getCategoryValidator, createCategoryValidator, updateCategoryValidator, deleteCategoryValidator } from "../middleware/validator/categoryValidator.js";
import { getCategories, getCategory, createCategory, updateCategory, deleteCategory } from "../controllers/category.controller.js";
import subCategoryRoute from "./subCategory.route.js";
import { uploadSingleImage, setUploadType } from "../config/cloudinary.js";
import { allowedTo } from "../middleware/allowTo.js";
import isAuth from "../middleware/isAuth.js";

// /api/v1/categories/:categoryId/subcategories ==> go to subCategoryRoute
router.use("/:categoryId/subcategories", subCategoryRoute)

// /api/v1/categories - public GET, protected POST
router.route("/")
    .get(getCategories)
    .post(isAuth, allowedTo('admin', 'manager'), setUploadType("categories"), uploadSingleImage("image"), createCategoryValidator, createCategory);

router.route("/:id")
    .get(getCategoryValidator, getCategory)
    .put(isAuth, allowedTo('admin', 'manager'), setUploadType("categories"), uploadSingleImage("image"), updateCategoryValidator, updateCategory)
    .delete(isAuth, allowedTo('admin'), deleteCategoryValidator, deleteCategory);

export default router;
