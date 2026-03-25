const express = require("express")
const {
    getSubCategories,
    getSubCategory,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    setCategoryId
} = require("../controllers/subCategory.controller");
const {
    createSubCategoryValidator,
    getSubCategoryValidator,
    updateSubCategoryValidator,
    deleteSubCategoryValidator
} = require("../middleware/validator/subCategoryValidator");
const { allowedTo } = require("../middleware/allowTo");
const isAuth = require("../middleware/isAuth");
const Category = require("../models/category.model");
const AppError = require("../utils/appError");
const asyncWrapper = require("../middleware/asyncWrapper");

// allow us to access the parameters of other route (/:categoryId/subcategories)
const router = express.Router({ mergeParams: true });

// Validate the parent `category` exists.
// - For nested routes: `/categories/:categoryId/subcategories` -> use `req.params.categoryId`
// - For direct routes: `/subcategories` -> use `req.body.category`
const validateCategoryExists = asyncWrapper(async (req, res, next) => {
    const categoryId = req.params.categoryId || req.body?.category;
    if (!categoryId) return next();
    // Reject malformed ObjectIds before hitting the DB
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return next(new AppError(`Invalid category ID: ${categoryId}`, 400));
    }
    const category = await Category.findById(categoryId);
    if (!category) {
        return next(new AppError(`No category found with ID: ${categoryId}`, 404));
    }
    next();
});

// (GET - POST) /api/v1/subcategories
router.route("/")
    .get(validateCategoryExists, getSubCategories)
    .post(isAuth, allowedTo('admin', 'manager'), validateCategoryExists, setCategoryId, createSubCategoryValidator, createSubCategory)

// (GET - PUT - DELETE) /api/v1/subcategories/:id
router.route("/:id")
    .get(validateCategoryExists, getSubCategoryValidator, getSubCategory)
    .put(isAuth, allowedTo('admin', 'manager'), updateSubCategoryValidator, updateSubCategory)
    .delete(isAuth, allowedTo('admin'), deleteSubCategoryValidator, deleteSubCategory)

module.exports = router;
