const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure directory exists
const ensureDirectoryExistence = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Dynamic storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadType = req.uploadType || 'others'; // Fallback to 'others' if not specified
        const uploadPath = path.join('uploads', uploadType); // Dynamic directory
        ensureDirectoryExistence(uploadPath); // Create directory if it doesn't exist
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const originalName = path.parse(file.originalname).name // Get the original name without extension
            .replace(/\s+/g, '-') // Replace spaces with dashes
            .replace(/[^a-zA-Z0-9-_]/g, ''); // Remove special characters
        const extension = path.extname(file.originalname); // Keep the original file extension

        if (req.uploadType === "users")
            cb(null, `user-${Date.now()}${extension}`);
        else if (req.uploadType === "products")
            cb(null, `product-${Date.now()}${extension}`);
        else if (req.uploadType === "categories")
            cb(null, `category-${Date.now()}${extension}`);
        else if (req.uploadType === "brands")
            cb(null, `brand-${Date.now()}${extension}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimeType && extName) {
        return cb(null, true);
    }
    cb(new Error('Unsupported file type. Please upload JPEG, JPG, or PNG files.'));
};

// Middleware to set the upload type dynamically
const setUploadType = (uploadType) => (req, res, next) => {
    req.uploadType = uploadType;
    next();
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
    }
});

const uploadSingleImage = (fieldName) => upload.single(fieldName);

const uploadMultipleImages = (arrayOfFields) => {
    return upload.fields(arrayOfFields);
};

module.exports = { uploadSingleImage, uploadMultipleImages, setUploadType };
