import express from 'express';
const router = express.Router();
import { createCouponValidation } from '../middleware/validator/couponValidator.js';
import { createCoupon, updateCoupon, deleteCoupon, getCoupon, getCoupons } from '../controllers/coupon.controller.js';

router.route('/')
    .get(getCoupons)
    .post(createCouponValidation, createCoupon);

router.route('/:id')
    .get(getCoupon)
    .put(updateCoupon)
    .delete(deleteCoupon);

export default router;
