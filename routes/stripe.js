const mongoose = require('mongoose');
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Orders = require("../models/orders");
const { Product } = require("../models/products");


router.post("/create-session", async (req, res) => {
  try {
    const { products, amount, userId } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ error: true, msg: "Không có sản phẩm nào!" });
    }


    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: products.map((item) => ({
        price_data: {
          currency: "vnd",
          product_data: {
            name: item.productTitle.length > 50 ? item.productTitle.substr(0, 50) : item.productTitle, // rút gọn title
          },
          unit_amount: item.price, // Stripe expects smallest currency unit, e.g., VND
        },
        quantity: item.quantity,
      })),
      metadata: {
        userid: userId,
        products: JSON.stringify(
          products.map(p => ({ productId: p.productId, quantity: p.quantity }))
        ),
      },
      success_url: `${process.env.CLIENT_BASE_URL}/success`,
      cancel_url: `${process.env.CLIENT_BASE_URL}/checkout`,
    });


    res.json({ id: session.id });
  } catch (error) {
    console.error("🔥 Lỗi Stripe:", error.message);
    res.status(500).json({ error: true, msg: "Không thể tạo phiên thanh toán!" });
  }
});


router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const event = req.body;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        const products = JSON.parse(session.metadata.products || "[]");

        const newOrder = new Orders({
          name: session.customer_details?.name || "Khách hàng",
          email: session.customer_details?.email,
          phoneNumber: session.customer_details?.phone || "",
          address:
            session.customer_details?.address?.line1 +
            ", " +
            session.customer_details?.address?.city || "",
          amount: session.amount_total / 100,
          paymentId: session.id,
          userid: session.metadata.userid,
          products: products,
          date: new Date(),
          status: "Chờ xử lí",
        });

        await newOrder.save();
        if (req.body.products && req.body.products.length > 0) {
          // Lọc các sản phẩm hợp lệ có productId
          const bulkOps = req.body.products
            .filter(item => item.productId)
            .map(item => ({
              updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(item.productId) },
                update: { $inc: { countInStock: -Number(item.quantity) } }
              }
            }));

          if (bulkOps.length > 0) {
            try {
              const result = await Product.bulkWrite(bulkOps, { ordered: false });
              console.log("✅ Sản phẩm đã được trừ kho:", result);
            } catch (err) {
              console.error("❌ Lỗi khi trừ kho:", err);
            }
          } else {
            console.warn("⚠️ Không có sản phẩm hợp lệ để trừ kho.");
          }
        }
        if (products && products.length > 0) {
          const bulkOps = products.map(item => ({
            updateOne: {
              filter: { _id: new mongoose.Types.ObjectId(item.productId) },
              update: { $inc: { countInStock: -item.quantity } }
            }
          }));

          await Product.bulkWrite(bulkOps);
          console.log("Đã trừ kho cho tất cả sản phẩm /webhook");
        }


      }

      res.status(200).send();
    } catch (err) {
      console.error(" Webhook error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

module.exports = router;
