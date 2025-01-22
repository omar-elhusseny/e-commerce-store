const express = require('express');
const router = express.Router();
const { createCouponValidation } = require('../middleware/validator/couponValidator');
const { createCoupon, updateCoupon, deleteCoupon, getCoupon, getCoupons } = require('../controllers/coupon.controller');

router.route('/')
    .get(getCoupons)
    .post(createCouponValidation, createCoupon);

router.route('/:id')
    .get(getCoupon)
    .put(updateCoupon)
    .delete(deleteCoupon);

module.exports = router;
