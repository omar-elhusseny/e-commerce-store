import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../app.js';
import prisma from '../../config/prisma.js';
import redisClient from '../../config/redis.js';

let token;
let refreshToken;
let firstProductId;
let createdOrderId;

test('auth login works', async () => {
    const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user1@example.com', password: 'Password123!' });

    assert.equal(res.status, 200);
    assert.ok(res.body?.data?.accessToken);
    token = res.body.data.accessToken;
  refreshToken = res.body.data.refreshToken;
});

test('products list endpoint works', async () => {
    const res = await request(app).get('/api/v1/products?page=1&limit=5');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    const active = res.body.data.find((p) => p.isActive !== false && Number(p.inventory) > 0);
    assert.ok(active, 'expected at least one active product with inventory');
    firstProductId = active.id;
});

test('cart add/get flow works', async () => {
    assert.ok(token, 'token should be set from login test');
    assert.ok(firstProductId, 'product id should be available');

    const addRes = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: firstProductId, quantity: 1 });

    assert.equal(addRes.status, 200);

    const getRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(getRes.status, 200);
    assert.ok(getRes.body?.cart);
});

test('order create/list endpoints work', async () => {
    assert.ok(token, 'token should be set from login test');

    const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ shippingAddress: 'Integration Test Address', paymentMethod: 'cash' });

    assert.equal(createRes.status, 201);
    assert.ok(createRes.body?.data?.id);
    createdOrderId = createRes.body.data.id;

    const listRes = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.data));
    assert.ok(listRes.body.data.some((o) => o.id === createdOrderId));
});

test('refresh token works without access token middleware', async () => {
  assert.ok(refreshToken, 'refresh token should be set from login test');
  const res = await request(app)
    .post('/api/v1/auth/refresh-token')
    .send({ refreshToken });

  assert.equal(res.status, 200);
  assert.ok(res.body?.data?.accessToken);
  assert.ok(res.body?.data?.refreshToken);
});

test('coupon usedCount increments on successful cash checkout', async () => {
  assert.ok(token, 'token should be set from login test');
  const user = await prisma.user.findUnique({ where: { email: 'user1@example.com' } });
  assert.ok(user, 'expected test user');
  const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
  assert.ok(cart, 'expected user cart');

  const coupon = await prisma.coupon.create({
    data: {
      name: `TEST${Date.now()}`,
      expire: new Date(Date.now() + 1000 * 60 * 60),
      discount: 5,
      minOrderValue: 0,
      usageLimit: 100,
      usedCount: 0,
      isActive: true,
    },
  });
  const before = coupon.usedCount;

  const product = await prisma.product.findFirst({ where: { isActive: true, inventory: { gt: 0 } } });
  assert.ok(product, 'expected an active in-stock product');
  const addRes = await request(app)
    .post('/api/v1/cart')
    .set('Authorization', `Bearer ${token}`)
    .send({ productId: product.id, quantity: 1 });
  assert.equal(addRes.status, 200);

  const applyRes = await request(app)
    .put('/api/v1/cart/apply-coupon')
    .set('Authorization', `Bearer ${token}`)
    .send({ coupon: coupon.name });
  assert.equal(applyRes.status, 200);

  const checkoutRes = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ shippingAddress: 'Coupon Checkout Address', paymentMethod: 'cash' });
  assert.equal(checkoutRes.status, 201);

  const afterCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
  assert.equal(afterCoupon.usedCount, before + 1);
});

test('teardown connections', async () => {
    await prisma.$disconnect();
    await redisClient.quit();
    assert.ok(true);
});
