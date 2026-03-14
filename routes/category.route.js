const express = require("express")
const router = express.Router();
const { getCategoryValidator, createCategoryValidator, updateCategoryValidator, deleteCategoryValidator } = require("../middleware/validator/categoryValidator");
const { getCategories, getCategory, createCategory, updateCategory, deleteCategory } = require("../controllers/category.controller");
const subCategoryRoute = require("./subCategory.route");
// const { uploadSingleImage, setUploadType } = require("../config/multer");
const { uploadSingleImage, setUploadType } = require("../config/cloudinary");
const { allowedTo } = require("../middleware/allowTo");


// /api/v1/categories/:categoryId/subcategories ==> go to subCategoryRoute
router.use("/:categoryId/subcategories", subCategoryRoute)

// /api/v1/categories - (get all categories - add category)
router.route("/")
    .get(getCategories)
    .post(allowedTo, setUploadType("categories"), uploadSingleImage("image"), createCategoryValidator, createCategory);

router.route("/:id")
    .get(getCategoryValidator, getCategory)
    .put(allowedTo, setUploadType("categories"), uploadSingleImage("image"), updateCategoryValidator, updateCategory)
    .delete(allowedTo, deleteCategoryValidator, deleteCategory);

module.exports = router;
