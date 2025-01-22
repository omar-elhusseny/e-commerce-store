const Subcategory = require("../models/subCategory.model");
const helperFunction = require("./crud.methods");

// added before validation in createSubCategory route
const editRequestBody = (req, res, next) => {
    // if the params have id, we use the nested route to add subcategory, if null, we use the original route to add it
    if (!req.body.category) req.body.category = req.params.categoryId;
    next();
}

const getSubCategories = helperFunction.getAll(Subcategory, { path: "category", select: "_id name" });

const getSubCategory = helperFunction.get(Subcategory, { path: "category", select: "_id name" });

const createSubCategory = helperFunction.create(Subcategory);

const updateSubCategory = helperFunction.update(Subcategory);

const deleteSubCategory = helperFunction.delete(Subcategory);

module.exports = { getSubCategories, getSubCategory, createSubCategory, updateSubCategory, deleteSubCategory, editRequestBody };