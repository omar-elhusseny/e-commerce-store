const helperFunction = require('./crud.methods');
const Coupon = require('../models/coupon.model');

exports.getCoupons = helperFunction.getAll(Coupon);

exports.getCoupon = helperFunction.get(Coupon);

exports.createCoupon = helperFunction.create(Coupon);

exports.updateCoupon = helperFunction.update(Coupon);

exports.deleteCoupon = helperFunction.delete(Coupon);
