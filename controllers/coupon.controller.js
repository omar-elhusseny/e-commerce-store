import prisma from "../config/prisma.js";
import asyncWrapper from "../middleware/asyncWrapper.js";
import AppError from "../utils/appError.js";
import redisClient from "../config/redis.js";
import { buildOrderBy, buildPagination, buildSelect, buildWhere, sortQueryObject } from "../utils/prismaQuery.js";
import { ok, created as sendCreated, noContent } from "../utils/apiResponse.js";

const MODEL_KEY = "coupons";

const getCoupons = asyncWrapper(async (req, res) => {
  const sortedQuery = sortQueryObject(req.query);
  const cacheKey = `${MODEL_KEY}:{}:${JSON.stringify(sortedQuery)}`;
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) return res.status(200).json(JSON.parse(cachedData));

  const { page, limit, skip } = buildPagination(req.query);
  const where = buildWhere(req.query);
  const [data, total] = await Promise.all([
    prisma.coupon.findMany({ where, skip, take: limit, orderBy: buildOrderBy(req.query.sort), select: buildSelect(req.query.fields) }),
    prisma.coupon.count({ where }),
  ]);

  const response = {
    results: data.length,
    paginationResult: { page, limit, pages: Math.ceil(total / limit), next: page * limit < total ? page + 1 : null, previous: page > 1 ? page - 1 : null },
    data,
  };

  await redisClient.set(cacheKey, JSON.stringify(response), { EX: 3600 });
  return ok(res, response.data, "Fetched successfully", { results: response.results, paginationResult: response.paginationResult });
});

const getCoupon = asyncWrapper(async (req, res, next) => {
  const cacheKey = `${MODEL_KEY}:${JSON.stringify({ id: req.params.id })}`;
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) return res.status(200).json({ data: JSON.parse(cachedData) });

  const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
  if (!coupon) return next(new AppError(`No document found for this id ${req.params.id}`, 404));

  await redisClient.set(cacheKey, JSON.stringify(coupon), { EX: 3600 });
  return ok(res, coupon, "Fetched successfully");
});

const createCoupon = asyncWrapper(async (req, res) => {
  const data = {
    ...req.body,
    name: req.body.name?.trim().toUpperCase(),
    expire: new Date(req.body.expire),
    discount: Number(req.body.discount),
    minOrderValue: req.body.minOrderValue ? Number(req.body.minOrderValue) : 0,
    usageLimit: req.body.usageLimit ? Number(req.body.usageLimit) : null,
  };

  const created = await prisma.coupon.create({ data });
  return sendCreated(res, created, "Created successfully");
});

const updateCoupon = asyncWrapper(async (req, res, next) => {
  const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(new AppError(`No document for this id ${req.params.id}`, 404));

  const data = {
    ...req.body,
    ...(req.body.name && { name: req.body.name.trim().toUpperCase() }),
    ...(req.body.expire && { expire: new Date(req.body.expire) }),
    ...(req.body.discount !== undefined && { discount: Number(req.body.discount) }),
    ...(req.body.minOrderValue !== undefined && { minOrderValue: Number(req.body.minOrderValue) }),
    ...(req.body.usageLimit !== undefined && { usageLimit: req.body.usageLimit === null ? null : Number(req.body.usageLimit) }),
  };

  const updated = await prisma.coupon.update({ where: { id: req.params.id }, data });
  return ok(res, updated, "Updated successfully");
});

const deleteCoupon = asyncWrapper(async (req, res, next) => {
  const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(new AppError(`No document for this id ${req.params.id}`, 404));

  await prisma.coupon.delete({ where: { id: req.params.id } });
  return noContent(res);
});

export { getCoupons, getCoupon, createCoupon, updateCoupon, deleteCoupon };
