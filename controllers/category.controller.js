const Category = require("../models/category.model");
const helperFunction = require("./crud.methods");
const asyncWrapper = require("../middleware/asyncWrapper"); // === "express-async-handler" package

const getCategories = helperFunction.getAll(Category);

const createCategory = helperFunction.create(Category);

const getCategory = helperFunction.get(Category);

const updateCategory = helperFunction.update(Category);

const deleteCategory = helperFunction.delete(Category);

module.exports = {
    getCategories,
    createCategory,
    getCategory,
    updateCategory,
    deleteCategory
};