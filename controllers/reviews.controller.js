import asyncWrapper from "../middleware/asyncWrapper.js";
import prisma from "../config/prisma.js";
import AppError from "../utils/appError.js";
import redisClient from "../config/redis.js";
import { buildOrderBy, buildPagination, buildSelect, buildWhere, sortQueryObject } from "../utils/prismaQuery.js";
import { ok, created as sendCreated, noContent } from "../utils/apiResponse.js";

const MODEL_KEY = "reviews";

const recalcProductRatings = async (productId) => {
    const reviews = await prisma.review.findMany({ where: { productId }, select: { rating: true } });
    const totalReviews = reviews.length;
    const avgRating = totalReviews ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
    await prisma.product.update({ where: { id: productId }, data: { avgRating, totalReviews } });
};

const setProductAndUser = (req, res, next) => {
    const nestedProductId = req.params.productId;
    req.body = req.body || {};
    if (!req.body.product && nestedProductId) req.body.product = nestedProductId;
    req.body.user = req.user.id;
    next();
};

const getReviews = asyncWrapper(async (req, res) => {
    const sortedQuery = sortQueryObject(req.query);
    const cacheKey = `${MODEL_KEY}:{}:${JSON.stringify(sortedQuery)}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.status(200).json(JSON.parse(cachedData));

    const { page, limit, skip } = buildPagination(req.query);
    const where = buildWhere(req.query);
    const [data, total] = await Promise.all([
        prisma.review.findMany({
            where,
            skip,
            take: limit,
            orderBy: buildOrderBy(req.query.sort),
            select: buildSelect(req.query.fields),
            include: buildSelect(req.query.fields) ? undefined : { user: { select: { username: true } }, product: { select: { name: true } } },
        }),
        prisma.review.count({ where }),
    ]);

    const response = {
        results: data.length,
        paginationResult: { page, limit, pages: Math.ceil(total / limit), next: page * limit < total ? page + 1 : null, previous: page > 1 ? page - 1 : null },
        data,
    };

    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 3600 });
    return ok(res, response.data, "Fetched successfully", { results: response.results, paginationResult: response.paginationResult });
});

const getReview = asyncWrapper(async (req, res, next) => {
    const review = await prisma.review.findUnique({
        where: { id: req.params.id },
        include: {
            user: { select: { username: true } },
            product: { select: { name: true } }
        },
    });
    if (!review) return next(new AppError(`No review found with id ${req.params.id}`, 404));
    return ok(res, review, "Fetched successfully");
});

const getProductReviews = asyncWrapper(async (req, res, next) => {
    const productId = req.params.productId;
    if (!productId) return next(new AppError('Product id is required', 400));

    const productExists = await prisma.product.findUnique({ where: { id: productId } });
    if (!productExists) return next(new AppError(`No product found with id ${productId}`, 404));

    const reviews = await prisma.review.findMany({ where: { productId }, include: { user: { select: { username: true } } } });
    return ok(res, reviews, "Fetched successfully", { results: reviews.length });
});

const createReview = asyncWrapper(async (req, res, next) => {
    const productId = req.params.productId || req.body.product;
    const productExists = await prisma.product.findUnique({ where: { id: productId } });
    if (!productExists) return next(new AppError(`No product found with id ${productId}`, 404));

    const hasPurchased = await prisma.order.findFirst({
        where: {
            userId: req.user.id,
            isPaid: true,
            status: 'delivered',
            items: { some: { productId: req.body.product } },
        },
    });
    if (!hasPurchased) return next(new AppError('You can only review products you have purchased and received.', 403));

    const review = await prisma.review.create({
        data: { title: req.body.title, rating: Number(req.body.rating), userId: req.user.id, productId: req.body.product },
    });
    await recalcProductRatings(review.productId);
    return sendCreated(res, review, "Review created");
});

const updateReview = asyncWrapper(async (req, res, next) => {
    const { title, rating } = req.body;
    const review = await prisma.review.update({
        where: { id: req.params.id },
        data: { ...(title !== undefined && { title }), ...(rating !== undefined && { rating: Number(rating) }) },
    }).catch(() => null);

    if (!review) return next(new AppError(`No review found with id ${req.params.id}`, 404));
    await recalcProductRatings(review.productId);
    return ok(res, review, "Fetched successfully");
});

const deleteReview = asyncWrapper(async (req, res, next) => {
    const review = await prisma.review.delete({ where: { id: req.params.id } }).catch(() => null);
    if (!review) return next(new AppError(`No review found with id ${req.params.id}`, 404));
    await recalcProductRatings(review.productId);
    return noContent(res);
});

export { setProductAndUser, getReviews, getReview, getProductReviews, createReview, updateReview, deleteReview };
