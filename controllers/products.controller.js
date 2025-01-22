const Product = require("../models/product.model");
const helperFunction = require("./crud.methods");

const getProducts = helperFunction.getAll(Product);

const getProduct = helperFunction.get(Product)

const addProduct = helperFunction.create(Product)

const updateProduct = helperFunction.update(Product);

const deleteProduct = helperFunction.delete(Product);

module.exports = { getProducts, getProduct, deleteProduct, updateProduct, addProduct };