import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../app.js';
import prisma from '../../config/prisma.js';
import redisClient from '../../config/redis.js';

let userToken;
let adminToken;

test('setup: login user and admin', async () => {
    const [userRes, adminRes] = await Promise.all([
        request(app).post('/api/v1/auth/login').send({ email: 'user1@example.com', password: 'Password123!' }),
        request(app).post('/api/v1/auth/login').send({ email: 'admin@example.com', password: 'Password123!' }),
    ]);

    assert.equal(userRes.status, 200);
    assert.equal(adminRes.status, 200);
    userToken = userRes.body.data.accessToken;
    adminToken = adminRes.body.data.accessToken;
});

test('unauthorized profile access is rejected', async () => {
    const res = await request(app).get('/api/v1/users/profile');
    assert.equal(res.status, 401);
});

test('invalid product id returns validation error', async () => {
    const res = await request(app).get('/api/v1/products/not-a-uuid');
    assert.equal(res.status, 400);
});

test('out-of-stock cart add returns 400', async () => {
    assert.ok(userToken, 'user token missing');

    const product = await prisma.product.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    assert.ok(product, 'expected at least one active product');

    const res = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ productId: product.id, quantity: Number(product.inventory) + 999 });

    assert.equal(res.status, 400);
});

test('review creation without delivered purchase is forbidden', async () => {
    assert.ok(userToken, 'user token missing');

    const user = await prisma.user.findUnique({ where: { email: 'user1@example.com' } });
    assert.ok(user, 'user1 should exist');

    const deliveredProductIds = await prisma.orderItem.findMany({
        where: { order: { userId: user.id, status: 'delivered', isPaid: true } },
        select: { productId: true },
        distinct: ['productId'],
    });

    const excluded = deliveredProductIds.map((x) => x.productId);
    const forbiddenProduct = await prisma.product.findFirst({
        where: { isActive: true, id: { notIn: excluded } },
        orderBy: { createdAt: 'desc' },
    });

    if (!forbiddenProduct) {
        const res = await request(app)
            .post('/api/v1/reviews')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ product: '11111111-1111-1111-1111-111111111111', rating: 4, title: 'temp' });
        assert.ok([400, 403, 404].includes(res.status));
        return;
    }

    const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ product: forbiddenProduct.id, rating: 4, title: 'Should fail' });

    assert.equal(res.status, 403);
});

test('non-admin cannot access coupons endpoint', async () => {
    assert.ok(userToken, 'user token missing');

    const res = await request(app)
        .get('/api/v1/coupons')
        .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 403);
});

test('admin can access coupons endpoint', async () => {
    assert.ok(adminToken, 'admin token missing');

    const res = await request(app)
        .get('/api/v1/coupons')
        .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
});

test('teardown connections', async () => {
    await prisma.$disconnect();
    await redisClient.quit();
    assert.ok(true);
});
