import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";

async function clearDatabase() {
    await prisma.productSubCategory.deleteMany();
    await prisma.review.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.wishListItem.deleteMany();
    await prisma.wishList.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.product.deleteMany();
    await prisma.subCategory.deleteMany();
    await prisma.category.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.address.deleteMany();
    await prisma.user.deleteMany();
}

const catalogBlueprint = [
    {
        category: { name: "Electronics", slug: "electronics" },
        subs: [
            { name: "Phones", slug: "phones" },
            { name: "Laptops", slug: "laptops" },
            { name: "Accessories", slug: "accessories" },
        ],
        brands: ["Apple", "Samsung", "Anker", "Lenovo"],
        colors: ["black", "silver", "white", "blue"],
    },
    {
        category: { name: "Fashion", slug: "fashion" },
        subs: [
            { name: "Men Clothing", slug: "men-clothing" },
            { name: "Women Clothing", slug: "women-clothing" },
            { name: "Footwear", slug: "footwear" },
        ],
        brands: ["Nike", "Adidas", "Zara", "Puma"],
        colors: ["white", "black", "green", "red"],
    },
    {
        category: { name: "Home", slug: "home" },
        subs: [
            { name: "Kitchen", slug: "kitchen" },
            { name: "Furniture", slug: "furniture" },
            { name: "Decor", slug: "decor" },
        ],
        brands: ["Ikea", "Tefal", "Panasonic", "Philips"],
        colors: ["beige", "brown", "gray", "white"],
    },
    {
        category: { name: "Sports", slug: "sports" },
        subs: [
            { name: "Fitness", slug: "fitness" },
            { name: "Outdoor", slug: "outdoor" },
            { name: "Cycling", slug: "cycling" },
        ],
        brands: ["Under Armour", "Reebok", "Decathlon", "Wilson"],
        colors: ["black", "orange", "blue", "yellow"],
    },
];

function pick(arr, i) {
    return arr[i % arr.length];
}

async function seed() {
    await clearDatabase();

    const hashedPassword = await bcrypt.hash("Password123!", 12);

    const admin = await prisma.user.create({
        data: {
            username: "admin_user",
            slug: "admin-user",
            email: "admin@example.com",
            password: hashedPassword,
            role: "admin",
            isEmailVerified: true,
        },
    });

    const users = [];
    for (let i = 1; i <= 12; i++) {
        const user = await prisma.user.create({
            data: {
                username: `test_user_${i}`,
                slug: `test-user-${i}`,
                email: `user${i}@example.com`,
                password: hashedPassword,
                role: "user",
                isEmailVerified: true,
            },
        });
        users.push(user);
    }

    await prisma.address.createMany({
        data: users.flatMap((user, i) => [
            {
                userId: user.id,
                alias: "Home",
                details: `${10 + i} Nile Street, Apt ${i + 1}`,
                phone: `+20100000${String(i + 100).padStart(3, "0")}`,
                city: i % 2 === 0 ? "Cairo" : "Giza",
                postalCode: `11${String(500 + i)}`,
            },
            {
                userId: user.id,
                alias: "Work",
                details: `Business Park ${i + 1}, Floor ${1 + (i % 7)}`,
                phone: `+20100000${String(i + 200).padStart(3, "0")}`,
                city: i % 3 === 0 ? "Alexandria" : "Cairo",
                postalCode: `12${String(500 + i)}`,
            },
        ]),
    });

    await prisma.address.create({
        data: {
            userId: admin.id,
            alias: "HQ",
            details: "Admin district building",
            phone: "+201099999999",
            city: "Cairo",
            postalCode: "11510",
        },
    });

    const categories = [];
    const subcategories = [];
    const brandsByName = new Map();

    for (const block of catalogBlueprint) {
        const category = await prisma.category.create({
            data: {
                name: block.category.name,
                slug: block.category.slug,
                image: `https://dummyimage.com/category-${block.category.slug}.jpg`,
            },
        });
        categories.push({ ...block, id: category.id });

        for (const sub of block.subs) {
            const createdSub = await prisma.subCategory.create({
                data: {
                    name: sub.name,
                    slug: sub.slug,
                    categoryId: category.id,
                },
            });
            subcategories.push(createdSub);
        }

        for (const brandName of block.brands) {
            if (!brandsByName.has(brandName)) {
                const brand = await prisma.brand.create({
                    data: {
                        name: brandName,
                        slug: brandName.toLowerCase().replace(/\s+/g, "-"),
                        image: `https://dummyimage.com/brand-${brandName.toLowerCase().replace(/\s+/g, "-")}.jpg`,
                    },
                });
                brandsByName.set(brandName, brand);
            }
        }
    }

    const products = [];
    let productCounter = 1;
    for (const category of categories) {
        const categorySubs = subcategories.filter((s) => s.categoryId === category.id);
        const categoryBrands = category.brands.map((b) => brandsByName.get(b));

        for (let i = 0; i < 15; i++) {
            const basePrice = 25 + productCounter * 7;
            const discounted = i % 3 === 0 ? Number((basePrice * 0.9).toFixed(2)) : null;
            const sub = pick(categorySubs, i);
            const brand = pick(categoryBrands, i);
            const colorA = pick(category.colors, i);
            const colorB = pick(category.colors, i + 1);

            const product = await prisma.product.create({
                data: {
                    name: `${brand.name} ${sub.name} Item ${productCounter}`,
                    slug: `${brand.slug}-${sub.slug}-item-${productCounter}`,
                    price: basePrice,
                    priceAfterDiscount: discounted,
                    description: `High quality ${sub.name.toLowerCase()} product for ${category.category.name.toLowerCase()} testing dataset item ${productCounter}.`,
                    inventory: 20 + (i % 25),
                    sold: i % 10,
                    isActive: i % 14 !== 0,
                    categoryId: category.id,
                    brandId: brand.id,
                    colors: [colorA, colorB],
                    mainImage: `https://dummyimage.com/product-${productCounter}-main.jpg`,
                    images: [
                        `https://dummyimage.com/product-${productCounter}-1.jpg`,
                        `https://dummyimage.com/product-${productCounter}-2.jpg`,
                    ],
                },
            });

            products.push(product);
            await prisma.productSubCategory.create({
                data: { productId: product.id, subCategoryId: sub.id },
            });

            productCounter += 1;
        }
    }

    await prisma.coupon.createMany({
        data: [
            {
                name: "WELCOME10",
                expire: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                discount: 10,
                minOrderValue: 100,
                usageLimit: 1000,
                usedCount: 0,
                isActive: true,
            },
            {
                name: "SPRING20",
                expire: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
                discount: 20,
                minOrderValue: 200,
                usageLimit: 500,
                usedCount: 15,
                isActive: true,
            },
            {
                name: "FLASH5",
                expire: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                discount: 5,
                minOrderValue: 50,
                usageLimit: null,
                usedCount: 0,
                isActive: true,
            },
        ],
    });

    const activeProducts = products.filter((p) => p.isActive);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];

        const cartProductA = pick(activeProducts, i * 2);
        const cartProductB = pick(activeProducts, i * 2 + 1);
        const cartTotal = cartProductA.price + cartProductB.price * 2;

        const cart = await prisma.cart.create({
            data: {
                userId: user.id,
                totalPrice: cartTotal,
                totalPriceAfterDiscount: Number((cartTotal * 0.95).toFixed(2)),
            },
        });

        await prisma.cartItem.createMany({
            data: [
                { cartId: cart.id, productId: cartProductA.id, quantity: 1 },
                { cartId: cart.id, productId: cartProductB.id, quantity: 2 },
            ],
        });

        const wishlist = await prisma.wishList.create({ data: { userId: user.id } });
        await prisma.wishListItem.createMany({
            data: [
                { wishlistId: wishlist.id, productId: pick(activeProducts, i + 10).id },
                { wishlistId: wishlist.id, productId: pick(activeProducts, i + 20).id },
                { wishlistId: wishlist.id, productId: pick(activeProducts, i + 30).id },
            ],
        });

        const orderStatuses = ["pending", "processing", "shipped", "delivered"];

        for (let o = 0; o < 2; o++) {
            const p1 = pick(activeProducts, i * 3 + o);
            const p2 = pick(activeProducts, i * 3 + o + 5);
            const qty1 = 1 + (o % 2);
            const qty2 = 1;
            const totalPrice = p1.price * qty1 + p2.price * qty2;
            const status = orderStatuses[(i + o) % orderStatuses.length];
            const isPaid = status !== "pending";

            const order = await prisma.order.create({
                data: {
                    userId: user.id,
                    username: user.username,
                    totalPrice,
                    status,
                    shippingAddress: `${20 + i} Test Street, Egypt`,
                    isPaid,
                    paidAt: isPaid ? new Date() : null,
                    paymentMethod: isPaid ? (o % 2 === 0 ? "card" : "cash") : "unknown",
                    paymentId: isPaid && o % 2 === 0 ? `pi_seed_${i}_${o}` : null,
                },
            });

            await prisma.orderItem.createMany({
                data: [
                    { orderId: order.id, productId: p1.id, product: p1.name, price: p1.price, quantity: qty1 },
                    { orderId: order.id, productId: p2.id, product: p2.name, price: p2.price, quantity: qty2 },
                ],
            });

            if (status === "delivered") {
                const reviewTarget = p1;
                const rating = 3 + ((i + o) % 3);
                await prisma.review.create({
                    data: {
                        title: `Review by ${user.username} for ${reviewTarget.name}`,
                        rating,
                        userId: user.id,
                        productId: reviewTarget.id,
                    },
                }).catch(() => null);
            }
        }
    }

    const allReviews = await prisma.review.findMany({ select: { productId: true, rating: true } });
    const grouped = new Map();
    for (const review of allReviews) {
        const list = grouped.get(review.productId) || [];
        list.push(review.rating);
        grouped.set(review.productId, list);
    }

    for (const [productId, ratings] of grouped.entries()) {
        const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
        await prisma.product.update({
            where: { id: productId },
            data: { avgRating: Number(avg.toFixed(2)), totalReviews: ratings.length },
        });
    }

    console.log("Seed completed successfully with larger dataset.");
    console.log("Admin:", { email: "admin@example.com", password: "Password123!" });
    console.log("Users:", {
        sample: ["user1@example.com", "user2@example.com", "user3@example.com"],
        password: "Password123!",
    });
    console.log("Counts:", {
        users: await prisma.user.count(),
        categories: await prisma.category.count(),
        subcategories: await prisma.subCategory.count(),
        brands: await prisma.brand.count(),
        products: await prisma.product.count(),
        orders: await prisma.order.count(),
        reviews: await prisma.review.count(),
        coupons: await prisma.coupon.count(),
    });
}

seed()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
