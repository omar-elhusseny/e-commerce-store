const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true, // Ensure unique usernames
    },
    slug: {
        type: String,
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // Ensure unique emails
    },
    password: {
        type: String,
        required: true,
    },
    profilePicture: String,
    role: {
        type: String,
        enum: ["user", "admin", "manager"], // Optional: Define allowed roles
        default: "user",
    },
    phone: String,
    addresses: [{
        id: { type: mongoose.Schema.Types.ObjectId },
        alias: String,
        details: String,
        phone: String,
        city: String,
        postalCode: String,
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    passwordResetCode: String,
    passwordResetExpires: Date,
    passwordResetVerified: Boolean,
    passwordChangedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
