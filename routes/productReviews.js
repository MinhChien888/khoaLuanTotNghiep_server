const { ProductReviews } = require('../models/productReviews');
const { Product } = require('../models/products'); // cần để cập nhật rating sản phẩm
const express = require('express');
const router = express.Router();

// ================= GET tất cả hoặc theo productId =================
router.get(`/`, async (req, res) => {
    try {
        let reviews = [];

        if (req.query.productId) {
            reviews = await ProductReviews.find({ productId: req.query.productId });
        } else {
            reviews = await ProductReviews.find();
        }

        if (!reviews) {
            return res.status(500).json({ success: false });
        }

        return res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================= Lấy số lượng đánh giá =================
router.get(`/get/count`, async (req, res) => {
    try {
        const productsReviews = await ProductReviews.countDocuments();
        res.send({ productsReviews });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ================= Lấy 1 đánh giá theo id =================
router.get('/:id', async (req, res) => {
    try {
        const review = await ProductReviews.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Không tìm thấy bài đánh giá có ID đã cho.' });
        }
        return res.status(200).send(review);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ================= Thêm đánh giá mới =================
router.post('/add', async (req, res) => {
    try {
        // 1️⃣ Tạo review mới
        let review = new ProductReviews({
            customerId: req.body.customerId,
            customerName: req.body.customerName,
            review: req.body.review,
            customerRating: parseFloat(req.body.customerRating), // chắc chắn là number
            productId: req.body.productId
        });

        review = await review.save();

        // 2️⃣ Lấy tất cả review của sản phẩm đó
        const reviews = await ProductReviews.find({ productId: req.body.productId });

        // 3️⃣ Tính rating trung bình
        const totalRating = reviews.reduce((sum, r) => sum + r.customerRating, 0);
        const averageRating = parseFloat((totalRating / reviews.length).toFixed(1));

        // 4️⃣ Cập nhật rating và số lượng review của sản phẩm
        await Product.findByIdAndUpdate(req.body.productId, {
            rating: averageRating,
            numReviews: reviews.length
        });

        // 5️⃣ Trả về kết quả
        return res.status(201).json({
            success: true,
            message: 'Đánh giá đã được thêm và rating sản phẩm cập nhật thành công',
            review,
            averageRating
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
