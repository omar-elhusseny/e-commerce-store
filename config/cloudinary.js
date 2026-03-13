const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const AppError = require("./appError");
const logger = require("./logger");

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage config for Multer + Cloudinary
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const folder = req.uploadType || "others"; // dynamic folder
        const timestamp = Date.now();
        let public_id = `file-${timestamp}`;

        switch (req.uploadType) {
            case "users":
                public_id = `user-${timestamp}`;
                break;
            case "products":
                public_id = `product-${timestamp}`;
                break;
            case "categories":
                public_id = `category-${timestamp}`;
                break;
            case "brands":
                public_id = `brand-${timestamp}`;
                break;
        }

        return {
            folder,
            public_id,
            resource_type: "image",
        };
    },
});

// File type filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extName = allowedTypes.test(file.originalname.split(".").pop().toLowerCase());
    if (mimeType && extName) return cb(null, true);
    cb(new AppError("Unsupported file type. Only JPEG, JPG, PNG allowed", 400));
};

// Multer instance
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Middleware to set upload type dynamically
const setUploadType = (uploadType) => (req, res, next) => {
    req.uploadType = uploadType;
    next();
};

// Single/multiple upload helpers
const uploadSingleImage = (fieldName) => upload.single(fieldName);
const uploadMultipleImages = (arrayOfFields) => upload.fields(arrayOfFields);

module.exports = { uploadSingleImage, uploadMultipleImages, setUploadType, cloudinary };