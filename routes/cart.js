const { Cart } = require('../models/cart');
const express = require('express');
const router = express.Router();


router.get(`/`, async (req, res) => {

    try {

        const cartList = await Cart.find(req.query);

        if (!cartList) {
            res.status(500).json({ success: false })
        }

        return res.status(200).json(cartList);

    } catch (error) {
        res.status(500).json({ success: false })
    }
});



router.post('/add', async (req, res) => {
    try {
        if (req.body.countInStock === 0) {
            return res.status(400).json({
                status: false,
                msg: "Sản phẩm đã hết hàng, không thể thêm vào giỏ."
            });
        }

        const cartItem = await Cart.find({ 
            productId: req.body.productId, 
            userId: req.body.userId 
        });

        if (cartItem.length === 0) {
            let cartList = new Cart({
                productTitle: req.body.productTitle,
                image: req.body.image,
                rating: req.body.rating,
                price: req.body.price,
                quantity: req.body.quantity,
                subTotal: req.body.subTotal,
                productId: req.body.productId,
                userId: req.body.userId,
                countInStock: req.body.countInStock,
            });

            const savedCart = await cartList.save();
            return res.status(201).json(savedCart);
        } else {
            return res.status(409).json({
                status: false,
                msg: "Sản phẩm đã có trong giỏ hàng."
            });
        }
    } catch (err) {
        console.error("Lỗi khi thêm vào giỏ:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi máy chủ. Vui lòng thử lại sau.",
            error: err.message
        });
    }
});



router.delete('/:id', async (req, res) => {

    const cartItem = await Cart.findById(req.params.id);

    if (!cartItem) {
        res.status(404).json({ msg: "Không tìm thấy giỏ hàng với ID đã cho!" })
    }

    const deletedItem = await Cart.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
        res.status(404).json({
            message: 'Không tìm thấy giỏ hàng!',
            success: false
        })
    }

    res.status(200).json({
        success: true,
        message: 'Giỏ hàng đã được xóa!'
    })
});



router.get('/:id', async (req, res) => {

    const catrItem = await Cart.findById(req.params.id);

    if (!catrItem) {
        res.status(500).json({ message: 'Không tìm thấy giỏ hàng với ID đã cho!' })
    }
    return res.status(200).send(catrItem);
})


router.put('/:id', async (req, res) => {

    const cartList = await Cart.findByIdAndUpdate(
        req.params.id,
        {
            productTitle: req.body.productTitle,
            image: req.body.image,
            rating: req.body.rating,
            price: req.body.price,
            quantity: req.body.quantity,
            subTotal: req.body.subTotal,
            productId: req.body.productId,
            userId: req.body.userId
        },
        { new: true }
    )

    if (!cartList) {
        return res.status(500).json({
            message: 'Không thể cập nhật giỏ hàng',
            success: false
        })
    }

    res.send(cartList);

})


module.exports = router;

