import prisma from "../config/prisma.js";
import { deleteImage } from "../config/cloudinary.js";
import asyncWrapper from "../middleware/asyncWrapper.js";
import AppError from "../utils/appError.js";
import redisClient from "../config/redis.js";
import { buildOrderBy, buildPagination, buildSelect, buildWhere, sortQueryObject } from "../utils/prismaQuery.js";
import { ok, created as sendCreated, noContent } from "../utils/apiResponse.js";

const MODEL_KEY = "categories";

const getCategories = asyncWrapper(async (req, res) => {
  const sortedQuery = sortQueryObject(req.query);
  const cacheKey = `${MODEL_KEY}:{}:${JSON.stringify(sortedQuery)}`;
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) return res.status(200).json(JSON.parse(cachedData));

  const { page, limit, skip } = buildPagination(req.query);
  const where = buildWhere(req.query);
  const [data, total] = await Promise.all([
    prisma.category.findMany({ where, skip, take: limit, orderBy: buildOrderBy(req.query.sort), select: buildSelect(req.query.fields) }),
    prisma.category.count({ where }),
  ]);

  const response = {
    results: data.length,
    paginationResult: { page, limit, pages: Math.ceil(total / limit), next: page * limit < total ? page + 1 : null, previous: page > 1 ? page - 1 : null },
    data,
  };

  await redisClient.set(cacheKey, JSON.stringify(response), { EX: 3600 });
  return ok(res, response.data, "Fetched successfully", { results: response.results, paginationResult: response.paginationResult });
});

const createCategory = asyncWrapper(async (req, res) => {
  const data = { ...req.body, ...(req.file && { image: req.file.path }) };
  const created = await prisma.category.create({ data });
  return sendCreated(res, created, "Created successfully");
});

const getCategory = asyncWrapper(async (req, res, next) => {
  const cacheKey = `${MODEL_KEY}:${JSON.stringify({ id: req.params.id })}`;
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) return res.status(200).json({ data: JSON.parse(cachedData) });

  const category = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!category) return next(new AppError(`No document found for this id ${req.params.id}`, 404));

  await redisClient.set(cacheKey, JSON.stringify(category), { EX: 3600 });
  return ok(res, category, "Fetched successfully");
});

const updateCategory = asyncWrapper(async (req, res, next) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(new AppError(`No document for this id ${req.params.id}`, 404));

  const data = { ...req.body };
  if (req.file) {
    await deleteImage(existing.image);
    data.image = req.file.path;
  }

  const updated = await prisma.category.update({ where: { id: req.params.id }, data });
  return ok(res, updated, "Updated successfully");
});

const deleteCategory = asyncWrapper(async (req, res, next) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(new AppError(`No document for this id ${req.params.id}`, 404));

  await deleteImage(existing.image);
  await prisma.category.delete({ where: { id: req.params.id } });
  return noContent(res);
});

export { getCategories, createCategory, getCategory, updateCategory, deleteCategory };
