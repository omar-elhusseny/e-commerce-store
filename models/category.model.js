const mongoose = require('mongoose');

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

module.exports = mongoose.model("Category", categorySchema);