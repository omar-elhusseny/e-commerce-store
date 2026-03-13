const mongoose = require('mongoose');
const clearModelCache = require("../utils/clearCache");

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Brand name required"],
        unique: [true, "Brand name must be unique"],
        minLength: [3, "Too short brand name"],
        maxLength: [32, "Too long brand name"]
    },
    slug: {
        type: String,
        lowercase: true
    },
    image: String
}, { timestamps: true });

// Indexing the name and description fields for full-text search
brandSchema.index({ name: "text", description: "text" });

productSchema.post("save", async function () {
    await clearModelCache(this.constructor.collection.name);
})

productSchema.post("findOneAndUpdate", async function () {
    await clearModelCache(this.model.collection.name);
});

productSchema.post("findOneAndDelete", async function () {
    await clearModelCache(this.model.collection.name);
});

module.exports = mongoose.model("Brand", brandSchema);