import prisma from "../config/prisma.js";
import asyncWrapper from "../middleware/asyncWrapper.js";
import AppError from "../utils/appError.js";

const getWishlist = asyncWrapper(async (req, res) => {
    const wishlist = await prisma.wishList.findMany({
        where: { userId: req.user.id },
        include: { items: { include: { product: { select: { id: true, name: true } } } } },
    });
    return res.status(200).json({ message: `Wishlist for ${req.user.username} retrieved successfully`, data: wishlist });
});

const addWishlist = asyncWrapper(async (req, res, next) => {
    const { productId } = req.body;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return next(new AppError("Product not found", 404));

    let wishlist = await prisma.wishList.findUnique({ where: { userId: req.user.id } });
    if (!wishlist) wishlist = await prisma.wishList.create({ data: { userId: req.user.id } });

    const exists = await prisma.wishListItem.findFirst({ where: { wishlistId: wishlist.id, productId } });
    if (exists) return next(new AppError("Product is already in the wishlist", 400));

    await prisma.wishListItem.create({ data: { wishlistId: wishlist.id, productId } });
    const updated = await prisma.wishList.findUnique({ where: { id: wishlist.id }, include: { items: true } });
    return res.status(200).json({ message: "Product added to wishlist successfully", data: updated });
});

const removeFromWishlist = asyncWrapper(async (req, res, next) => {
    const wishlist = await prisma.wishList.findUnique({ where: { userId: req.user.id } });
    if (!wishlist) return next(new AppError("Wishlist not found", 404));

    const deleted = await prisma.wishListItem.deleteMany({ where: { wishlistId: wishlist.id, productId: req.params.id } });
    if (!deleted.count) return next(new AppError("Product not found in wishlist", 404));

    const updated = await prisma.wishList.findUnique({ where: { id: wishlist.id }, include: { items: true } });
    return res.status(200).json({ message: "Product removed from wishlist successfully", data: updated });
});

const clearWishlist = asyncWrapper(async (req, res, next) => {
    const wishlist = await prisma.wishList.findUnique({ where: { userId: req.user.id } });
    if (!wishlist) return next(new AppError("Wishlist not found", 404));
    await prisma.wishListItem.deleteMany({ where: { wishlistId: wishlist.id } });
    return res.status(200).json({ message: 'Wishlist cleared', wishlist: { ...wishlist, products: [] } });
});

export { getWishlist, addWishlist, removeFromWishlist, clearWishlist };
