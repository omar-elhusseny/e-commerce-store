const express = require("express")
const { getSubCategories, getSubCategory, createSubCategory, updateSubCategory, deleteSubCategory, editRequestBody } = require("../controllers/subCategory.controller");
const { createSubCategoryValidator, getSubCategoryValidator, updateSubCategoryValidator, deleteSubCategoryValidator } = require("../middleware/validator/subCategoryValidator");
const { allowedTo } = require("../middleware/allowTo");

// allow us to access the parameters of other route (/:categoryId/subcategories)
const router = express.Router({ mergeParams: true });

router.route("/")
    .get(getSubCategories)
    .post(allowedTo, editRequestBody, createSubCategoryValidator, createSubCategory)

router.route("/:id")
    .get(getSubCategoryValidator, getSubCategory)
    .put(allowedTo, updateSubCategoryValidator, updateSubCategory)
    .delete(allowedTo, deleteSubCategoryValidator, deleteSubCategory)

module.exports = router;
