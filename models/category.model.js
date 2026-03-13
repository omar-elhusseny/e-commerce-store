const mongoose = require('mongoose');
const clearModelCache = require("../utils/clearCache");


const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Category name required"],
        unique: [true, "Category name must be unique"],
        minLength: [3, "Too short category name"],
        maxLength: [32, "Too long category name"]
    },
    // A and B ==> url/a-and-b
    slug: {
        type: String,
        lowercase: true
    },
    image: String
}, { timestamps: true });

categorySchema.index({ name: "text" });

productSchema.post("save", async function () {
    await clearModelCache(this.constructor.collection.name);
})

productSchema.post("findOneAndUpdate", async function () {
    await clearModelCache(this.model.collection.name);
});

productSchema.post("findOneAndDelete", async function () {
    await clearModelCache(this.model.collection.name);
});

module.exports = mongoose.model("Category", categorySchema);