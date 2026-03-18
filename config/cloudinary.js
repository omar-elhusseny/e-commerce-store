const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — files are held in buffer then streamed to Cloudinary
const storage = multer.memoryStorage();

// File type filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extName = allowedTypes.test(file.originalname.split(".").pop().toLowerCase());
    if (mimeType && extName) return cb(null, true);
    cb(new AppError("Unsupported file type. Only JPEG, JPG, PNG allowed", 400));
};

// Multer instance (memory storage, no third-party Cloudinary adapter needed)
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Upload a buffer to Cloudinary and return the secure URL
const uploadToCloudinary = (buffer, folder, public_id) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, public_id, resource_type: "image" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

// Build the public_id based on upload type
const buildPublicId = (uploadType) => {
    const timestamp = Date.now();
    const map = {
        users: `user-${timestamp}`,
        products: `product-${timestamp}`,
        categories: `category-${timestamp}`,
        brands: `brand-${timestamp}`,
    };
    return map[uploadType] || `file-${timestamp}`;
};

// Middleware to set the upload type dynamically
const setUploadType = (uploadType) => (req, res, next) => {
    req.uploadType = uploadType;
    next();
};

// After multer puts file(s) in memory, stream them up to Cloudinary
// and attach the secure_url back to req.file.path / req.files[field][i].path
// so all controllers keep working without any changes.
const uploadToCloud = async (req, res, next) => {
    try {
        const folder = req.uploadType || "others";

        if (req.file) {
            const public_id = buildPublicId(req.uploadType);
            req.file.path = await uploadToCloudinary(req.file.buffer, folder, public_id);
        }

        if (req.files) {
            for (const field of Object.keys(req.files)) {
                for (const file of req.files[field]) {
                    const public_id = buildPublicId(req.uploadType);
                    file.path = await uploadToCloudinary(file.buffer, folder, public_id);
                }
            }
        }

        next();
    } catch (error) {
        logger.error(`Cloudinary upload failed: ${error.message}`);
        next(new AppError("Image upload failed", 500));
    }
};

// Single image upload helper
const uploadSingleImage = (fieldName) => [
    upload.single(fieldName),
    uploadToCloud,
];

// Multiple images upload helper
const uploadMultipleImages = (arrayOfFields) => [
    upload.fields(arrayOfFields),
    uploadToCloud,
];

// Delete an image from Cloudinary by its URL
const deleteImage = async (imageUrl) => {
    if (!imageUrl) return;
    try {
        const matches = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
        if (!matches) return;
        const public_id = matches[1];
        await cloudinary.uploader.destroy(public_id);
        logger.info(`Deleted Cloudinary image: ${public_id}`);
    } catch (error) {
        logger.error(`Failed to delete Cloudinary image: ${error.message}`);
    }
};

module.exports = { uploadSingleImage, uploadMultipleImages, setUploadType, cloudinary, deleteImage };