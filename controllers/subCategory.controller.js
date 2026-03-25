const Subcategory = require("../models/subCategory.model");
const helperFunction = require("./crud.methods");
const asyncWrapper = require("../middleware/asyncWrapper");

const setCategoryId = (req, res, next) => {
    // When accessed via `/categories/:categoryId/subcategories`, force the parent
    // category id from the URL to avoid creating subcategories under
    // a non-matching/non-existent category.
    if (req.params.categoryId) {
        req.body = req.body || {};
        req.body.category = req.params.categoryId;
    }
    next();
};

// When accessed via /categories/:categoryId/subcategories, filter by that category.
// When accessed directly via /subcategories, return all (no forced filter).
const getSubCategories = asyncWrapper(async (req, res, next) => {
    let filter = {};
    if (req.params.categoryId) {
        filter.category = req.params.categoryId;
    }
    return helperFunction.getAll(Subcategory, null, filter)(req, res, next);
});

const getSubCategory = asyncWrapper(async (req, res, next) => {
    let filter = { _id: req.params.id };

    // ✅ enforce parent relationship
    if (req.params.categoryId) {
        filter.category = req.params.categoryId;
    }

    return helperFunction.get(Subcategory, null, filter)(req, res, next);
});

const createSubCategory = helperFunction.create(Subcategory);

const updateSubCategory = helperFunction.update(Subcategory);

const deleteSubCategory = helperFunction.delete(Subcategory);

module.exports = {
    getSubCategories,
    getSubCategory,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    setCategoryId
};