const express = require("express")
const router = express.Router();
const { getCategoryValidator, createCategoryValidator, updateCategoryValidator, deleteCategoryValidator } = require("../middleware/validator/categoryValidator");
const { getCategories, getCategory, createCategory, updateCategory, deleteCategory } = require("../controllers/category.controller");
const subCategoryRoute = require("./subCategory.route");
const { uploadSingleImage, setUploadType } = require("../config/cloudinary");
const { allowedTo } = require("../middleware/allowTo");
const isAuth = require("../middleware/isAuth");

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

module.exports = router;
