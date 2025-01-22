const mongoose = require("mongoose");

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

module.exports = mongoose.model("Subcategory", subCategorySchema);