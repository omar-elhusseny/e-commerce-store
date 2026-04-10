import prisma from '../config/prisma.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import redisClient from "../config/redis.js";
import { buildOrderBy, buildPagination, buildSelect, buildWhere, sortQueryObject } from "../utils/prismaQuery.js";
import { ok, created as sendCreated, noContent } from "../utils/apiResponse.js";
import AppError from '../utils/appError.js';
import { deleteImage } from "../config/cloudinary.js";

const MODEL_KEY = "products";
const getProducts = asyncWrapper(async (req, res) => {
    const sortedQuery = sortQueryObject(req.query);
    const cacheKey = `${MODEL_KEY}:{}:${JSON.stringify(sortedQuery)}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.status(200).json(JSON.parse(cachedData));

    const { page, limit, skip } = buildPagination(req.query);
    const where = buildWhere(req.query);
    const [data, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take: limit,
            orderBy: buildOrderBy(req.query.sort),
            select: buildSelect(req.query.fields)
        }),
        prisma.product.count({ where }),
    ]);

    const response = {
        results: data.length,
        paginationResult: {
            page,
            limit,
            pages: Math.ceil(total / limit),
            next: page * limit < total ? page + 1 : null,
            previous: page > 1 ? page - 1 : null
        },
        data,
    };

    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 3600 });
    return ok(res, response.data, "Fetched successfully", { results: response.results, paginationResult: response.paginationResult });
});

const getProduct = asyncWrapper(async (req, res, next) => {
    const product = await prisma.product.findUnique({
        where: { id: req.params.id },
        include: {
            subcategories: { include: { subCategory: true } },
            category: true,
            brand: true
        },
    });
    if (!product) return next(new AppError(`No document found for this id ${req.params.id}`, 404));
    return ok(res, product, "Fetched successfully");
});

const addProduct = asyncWrapper(async (req, res) => {
    const data = {
        ...req.body,
        categoryId: req.body.category,
        brandId: req.body.brand || null,
        mainImage: req.files?.mainImage?.[0]?.path,
        images: req.files?.images?.map((f) => f.path) || [],
        colors: Array.isArray(req.body.colors) ? req.body.colors : (req.body.colors ? [req.body.colors] : []),
        price: Number(req.body.price),
        inventory: Number(req.body.inventory),
        sold: Number(req.body.sold || 0),
        priceAfterDiscount: req.body.priceAfterDiscount ? Number(req.body.priceAfterDiscount) : null,
    };

    delete data.category;
    delete data.subcategory;
    delete data.brand;

    const product = await prisma.product.create({ data });

    const subcategories = req.body.subcategory ? (Array.isArray(req.body.subcategory) ? req.body.subcategory : [req.body.subcategory]) : [];
    if (subcategories.length) {
        await prisma.productSubCategory.createMany({
            data: subcategories.map((subCategoryId) => ({ productId: product.id, subCategoryId })),
            skipDuplicates: true,
        });
    }

    const created = await prisma.product.findUnique({ where: { id: product.id }, include: { subcategories: true } });
    return sendCreated(res, created, "Created successfully");
});

const updateProduct = asyncWrapper(async (req, res, next) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError(`No document for this id ${req.params.id}`, 404));

    const data = {
        ...req.body,
        ...(req.body.category && { categoryId: req.body.category }),
        ...(req.body.brand !== undefined && { brandId: req.body.brand || null }),
        ...(req.files?.mainImage && { mainImage: req.files.mainImage[0].path }),
        ...(req.files?.images && { images: req.files.images.map((f) => f.path) }),
        ...(req.body.price !== undefined && { price: Number(req.body.price) }),
        ...(req.body.inventory !== undefined && { inventory: Number(req.body.inventory) }),
        ...(req.body.sold !== undefined && { sold: Number(req.body.sold) }),
        ...(req.body.priceAfterDiscount !== undefined && { priceAfterDiscount: Number(req.body.priceAfterDiscount) }),
    };

    delete data.category;
    delete data.subcategory;
    delete data.brand;

    await prisma.product.update({ where: { id: req.params.id }, data });

    if (req.body.subcategory) {
        const subcategories = Array.isArray(req.body.subcategory) ? req.body.subcategory : [req.body.subcategory];
        await prisma.productSubCategory.deleteMany({ where: { productId: req.params.id } });
        await prisma.productSubCategory.createMany({ data: subcategories.map((subCategoryId) => ({ productId: req.params.id, subCategoryId })), skipDuplicates: true });
    }

    const updated = await prisma.product.findUnique({ where: { id: req.params.id }, include: { subcategories: true } });
    return ok(res, updated, "Updated successfully");
});

const deleteProduct = asyncWrapper(async (req, res, next) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError(`No document for this id ${req.params.id}`, 404));

    await deleteImage(existing.mainImage);
    if (Array.isArray(existing.images) && existing.images.length) {
        await Promise.all(existing.images.map((url) => deleteImage(url)));
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    return noContent(res);
});

export { getProducts, getProduct, deleteProduct, updateProduct, addProduct };
