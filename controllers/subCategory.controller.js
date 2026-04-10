import asyncWrapper from "../middleware/asyncWrapper.js";
import prisma from '../config/prisma.js';
import AppError from '../utils/appError.js';
import redisClient from "../config/redis.js";
import { buildOrderBy, buildPagination, buildSelect, buildWhere, sortQueryObject } from "../utils/prismaQuery.js";
import { ok, created as sendCreated, noContent } from "../utils/apiResponse.js";

const MODEL_KEY = "subcategories";

const setCategoryId = (req, res, next) => {
  if (req.params.categoryId) {
    req.body = req.body || {};
    req.body.category = req.params.categoryId;
  }
  next();
};

const getSubCategories = asyncWrapper(async (req, res) => {
  const forcedFilter = req.params.categoryId ? { categoryId: req.params.categoryId } : {};
  const sortedQuery = sortQueryObject(req.query);
  const cacheKey = `${MODEL_KEY}:${JSON.stringify(forcedFilter)}:${JSON.stringify(sortedQuery)}`;
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) return res.status(200).json(JSON.parse(cachedData));

  const { page, limit, skip } = buildPagination(req.query);
  const where = buildWhere(req.query, forcedFilter);
  const [data, total] = await Promise.all([
    prisma.subCategory.findMany({ where, skip, take: limit, orderBy: buildOrderBy(req.query.sort), select: buildSelect(req.query.fields) }),
    prisma.subCategory.count({ where }),
  ]);

  const response = {
    results: data.length,
    paginationResult: { page, limit, pages: Math.ceil(total / limit), next: page * limit < total ? page + 1 : null, previous: page > 1 ? page - 1 : null },
    data,
  };
  await redisClient.set(cacheKey, JSON.stringify(response), { EX: 3600 });
  return ok(res, response.data, "Fetched successfully", { results: response.results, paginationResult: response.paginationResult });
});

const getSubCategory = asyncWrapper(async (req, res, next) => {
  const subcategory = await prisma.subCategory.findUnique({ where: { id: req.params.id } });
  if (!subcategory) return next(new AppError(`No document found for this id ${req.params.id}`, 404));
  if (req.params.categoryId && subcategory.categoryId !== req.params.categoryId) {
    return next(new AppError(`No document found for this id ${req.params.id}`, 404));
  }
  return ok(res, subcategory, "Fetched successfully");
});

const createSubCategory = asyncWrapper(async (req, res) => {
  const created = await prisma.subCategory.create({
    data: { name: req.body.name, slug: req.body.slug, categoryId: req.body.category },
  });
  return sendCreated(res, created, "Created successfully");
});

const updateSubCategory = asyncWrapper(async (req, res, next) => {
  const exists = await prisma.subCategory.findUnique({ where: { id: req.params.id } });
  if (!exists) return next(new AppError(`No document for this id ${req.params.id}`, 404));

  const updated = await prisma.subCategory.update({
    where: { id: req.params.id },
    data: { ...req.body, ...(req.body.category && { categoryId: req.body.category }) },
  });
  return ok(res, updated, "Updated successfully");
});

const deleteSubCategory = asyncWrapper(async (req, res, next) => {
  const exists = await prisma.subCategory.findUnique({ where: { id: req.params.id } });
  if (!exists) return next(new AppError(`No document for this id ${req.params.id}`, 404));

  await prisma.subCategory.delete({ where: { id: req.params.id } });
  return noContent(res);
});

export { getSubCategories, getSubCategory, createSubCategory, updateSubCategory, deleteSubCategory, setCategoryId };
