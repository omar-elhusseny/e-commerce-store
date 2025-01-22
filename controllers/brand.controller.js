const Brand = require("../models/brand.model");
const helperFunction = require("./crud.methods");

const getBrands = helperFunction.getAll(Brand);

const createBrand = helperFunction.create(Brand)

const getBrand = helperFunction.get(Brand)

const updateBrand = helperFunction.update(Brand)

const deleteBrand = helperFunction.delete(Brand)

module.exports = { getBrands, createBrand, getBrand, updateBrand, deleteBrand };