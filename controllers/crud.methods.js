const asyncWrapper = require("../middleware/asyncWrapper"); // === "express-async-handler" package
const AppError = require("../utils/appError");
const QueryHelper = require("../utils/queryHelper");
const fs = require('fs');

exports.delete = (Model) => {
    return asyncWrapper(async (req, res, next) => {
        const { id } = req.params;
        const document = await Model.findByIdAndDelete(id);

        if (!document) {
            return next(new AppError(`No document for this id ${id}`, 404));
        }

        return res.status(204).send();
    })
}

exports.update = (Model) => {
    return asyncWrapper(async (req, res, next) => {
        const { id } = req.params;
        const data = { ...req.body };

        // Retrieve the document to be updated
        const document = await Model.findById(id);
        if (!document) return next(new AppError(`No document for this id ${id}`, 404));

        if (req.file) {
            // Delete the old image if it exists
            if (document.image && fs.existsSync(document.image)) {
                fs.unlinkSync(document.image);
            }
            data.image = req.file.path;
        }

        // Handle main image update (single file under req.files.mainImage)
        if (req.files && req.files.mainImage) {
            // If there's an old main image, delete it
            if (document.mainImage && fs.existsSync(document.mainImage)) {
                fs.unlinkSync(document.mainImage);
            }
            // Save the new main image path
            data.mainImage = req.files.mainImage[0].path; // Assuming mainImage is a single file
        }

        // Handle multiple images (e.g., other images associated with the product/brand)
        if (req.files && req.files.images) {
            // If old images exist, delete them first
            if (document.images) {
                document.images.forEach((oldFilePath) => {
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                    }
                });
            }
            // Assign new images to the document
            data.images = req.files.images.map((file) => file.path); // Handling multiple images
        }

        // Proceed with updating the document with the new data
        const updatedDocument = await Model.findByIdAndUpdate(id, data, { new: true });
        if (!updatedDocument) return next(new AppError(`No document for this id ${id}`, 404));

        return res.status(200).json({ data: updatedDocument });
    });
};

exports.create = (Model) => {
    return asyncWrapper(async (req, res) => {
        // Merge file data with request body if an image is uploaded
        const data = { ...req.body };
        if (req.file) {
            data.image = req.file.path;
        } else if (req.files) {
            Object.keys(req.files).forEach((key) => {
                if (key === "mainImage") {
                    // Store the first file path for mainImage
                    data[key] = req.files[key][0].path;
                } else {
                    // Store an array of file paths for other fields
                    data[key] = req.files[key].map((file) => file.path);
                }
            });
        }
        const newDocument = await Model.create(data);
        return res.status(201).json({ data: newDocument });
    });
};

exports.get = (Model, population) => {
    return asyncWrapper(async (req, res, next) => {
        const { id } = req.params;

        // 1) Build query
        let query = Model.findById(id);

        if (population) query = query.populate(population);

        // 2) Execute query
        const document = await query;

        if (!document) return next(new AppError(`No document for this id ${id}`, 404));

        res.status(200).json({ data: document });
    });
}

exports.getAll = (Model, population) => {
    return asyncWrapper(async (req, res) => {
        const documents = await Model.countDocuments();
        // Model.find() return the query object will use to search in database but not executed yet.
        // we build the query by adding methods which added to query (query object)
        // 1) Build query
        const queryHelper = new QueryHelper(Model.find(), req.query)
            .filter()
            .paginate(documents)
            .sort()
            .search()
            .selectFields()

        if (population) queryHelper.query = queryHelper.query.populate(population);

        const { paginationResult } = queryHelper;
        // we start to execute with await/then()/exec() using the query object (.query)
        // Final query object

        // 2) Execute query
        const modelDocuments = await queryHelper.query;
        return res.status(200).json({ results: modelDocuments.length, paginationResult, data: modelDocuments });
    })
}