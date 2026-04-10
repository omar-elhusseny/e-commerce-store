import express from "express"
import { getSubCategories,
    getSubCategory,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    setCategoryId } from "../controllers/subCategory.controller.js";
import { createSubCategoryValidator,
    getSubCategoryValidator,
    updateSubCategoryValidator,
    deleteSubCategoryValidator } from "../middleware/validator/subCategoryValidator.js";
import { allowedTo } from "../middleware/allowTo.js";
import isAuth from "../middleware/isAuth.js";
import prisma from "../config/prisma.js";
import AppError from "../utils/appError.js";
import asyncWrapper from "../middleware/asyncWrapper.js";

// allow us to access the parameters of other route (/:categoryId/subcategories)
const router = express.Router({ mergeParams: true });

// Validate the parent `category` exists.
// - For nested routes: `/categories/:categoryId/subcategories` -> use `req.params.categoryId`
// - For direct routes: `/subcategories` -> use `req.body.category`
const validateCategoryExists = asyncWrapper(async (req, res, next) => {
    const categoryId = req.params.categoryId || req.body?.category;
    if (!categoryId) return next();
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
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

export default router;
