const asyncWrapper = require("../middleware/asyncWrapper"); // === "express-async-handler" package
const AppError = require("../utils/appError");
const QueryHelper = require("../utils/queryHelper");
const { deleteImage } = require("../config/cloudinary")
const redisClient = require("../config/redis");

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
            // Delete the old image from Cloudinary if it exists
            await deleteImage(document.image);
            data.image = req.file.path;
        }

        // Handle main image update (single file under req.files.mainImage)
        if (req.files && req.files.mainImage) {
            // Delete the old main image from Cloudinary if it exists
            await deleteImage(document.mainImage);
            // Save the new main image path
            data.mainImage = req.files.mainImage[0].path; // Assuming mainImage is a single file
        }

        // Handle multiple images (e.g., other images associated with the product/brand)
        if (req.files && req.files.images) {
            // Delete old images from Cloudinary
            if (document.images) {
                await Promise.all(document.images.map((url) => deleteImage(url)));
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

        // 1) Generate a unique cache key for this product
        const cacheKey = `${Model.collection.name}:${id}`;

        console.log(cacheKey)

        // 2) Check Redis cache
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json({ data: JSON.parse(cachedData) });
        }

        // 3) Build the database query
        let query = Model.findById(id);
        if (population) query = query.populate(population);

        // 4) Execute the query
        const document = await query;

        // 5) Handle the case where no document is found
        if (!document) return next(new AppError(`No document for this id ${id}`, 404));

        // 6) Store the result in Redis for future requests
        await redisClient.set(cacheKey, JSON.stringify(document), { EX: 3600 }); // Cache expires in 1 hour

        // 7) Return the response to the client
        res.status(200).json({ data: document });
    });
}

exports.getAll = (Model, population) => {
    return asyncWrapper(async (req, res) => {

        // Sort the queries to be same pattern saved in Caching
        const sortedQuery = Object.keys(req.query)
            .sort()
            .reduce((acc, key) => {
                acc[key] = req.query[key];
                return acc;
            }, {});

        // Generate a unique cache key based on the request query
        const cacheKey = `${Model.collection.name}:${JSON.stringify(sortedQuery)}`;

        // Check if data is in Redis cache
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json(JSON.parse(cachedData));
        }

        // Model.find() return the query object will use to search in database but not executed yet.
        const queryHelper = new QueryHelper(Model.find(), req.query)
            // we build the query by adding methods which added to query (query object)
            .filter()
            .sort()
            .search()
            .selectFields()

        // To make MongoDB counts only filtered results.
        const documents = await Model.countDocuments(queryHelper.query.getQuery());

        queryHelper.paginate(documents);

        if (population) queryHelper.query = queryHelper.query.populate(population);

        // Execute query
        const modelDocuments = await queryHelper.query.exec();

        // Prepare the response object
        const response = {
            results: modelDocuments.length,
            paginationResult: queryHelper.paginationResult,
            data: modelDocuments
        };

        // Store the response in Redis for future requests
        await redisClient.set(cacheKey, JSON.stringify(response), { EX: 3600 }); // Cache expires in 1 hour

        // Return the response to the client
        return res.status(200).json(response);
    })
}