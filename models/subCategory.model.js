const mongoose = require("mongoose");
const clearModelCache = require("../utils/clearCache");

const subCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        unique: [true, "Must be unique"],
        minLength: [2, "Too short name"],
        maxLength: [32, "Too long name"],
    },
    slug: {
        type: String,
        lowercase: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: [true, "Provide the main category for this subcategory"]
    },
}, { timestamps: true })

subCategorySchema.index({ name: "text" });

subCategorySchema.post("save", async function () {
    await clearModelCache(this.constructor.collection.name);
})

subCategorySchema.post("findOneAndUpdate", async function () {
    await clearModelCache(this.model.collection.name);
});

subCategorySchema.post("findOneAndDelete", async function () {
    await clearModelCache(this.model.collection.name);
});

module.exports = mongoose.model("Subcategory", subCategorySchema);