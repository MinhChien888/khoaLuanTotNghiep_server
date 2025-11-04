const mongoose = require('mongoose');
const { Orders } = require('../models/orders');
const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/sendEmail');
const { Product } = require('../models/products');



router.get(`/sales`, async (req, res) => {
    try {
        const currentYear = parseInt(req?.query?.year);

        const ordersList = await Orders.find();

        let totalSales = 0;
        let monthlySales = [
            {
                month: 'JAN',
                sale: 0
            },
            {
                month: 'FEB',
                sale: 0
            },
            {
                month: 'MAR',
                sale: 0
            },
            {
                month: 'APRIL',
                sale: 0
            },
            {
                month: 'MAY',
                sale: 0
            },
            {
                month: 'JUNE',
                sale: 0
            },
            {
                month: 'JULY',
                sale: 0
            },
            {
                month: 'AUG',
                sale: 0
            },
            {
                month: 'SEP',
                sale: 0
            },
            {
                month: 'OCT',
                sale: 0
            },
            {
                month: 'NOV',
                sale: 0
            },
            {
                month: 'DEC',
                sale: 0
            },
        ]



        //console.log(currentYear)

        for (let i = 0; i < ordersList.length; i++) {
            totalSales = totalSales + parseInt(ordersList[i].amount);
            const str = JSON.stringify(ordersList[i]?.date);
            const year = str.substr(1, 4);
            const monthStr = str.substr(6, 8);
            const month = parseInt(monthStr.substr(0, 2));

            let amt = parseInt(ordersList[i].amount);

            if (currentYear == year) {

                if (month === 1) {
                    monthlySales[0] = {
                        month: 'JAN',
                        sale: monthlySales[0].sale = parseInt(monthlySales[0].sale) + parseInt(ordersList[i].amount)
                    }
                }

                if (month === 2) {

                    monthlySales[1] = {
                        month: 'FEB',
                        sale: monthlySales[1].sale = parseInt(monthlySales[1].sale) + parseInt(ordersList[i].amount)
                    }
                }

                if (month === 3) {
                    monthlySales[2] = {
                        month: 'MAR',
                        sale: monthlySales[2].sale = parseInt(monthlySales[2].sale) + parseInt(ordersList[i].amount)
                    }
                }

                if (month === 4) {
                    monthlySales[3] = {
                        month: 'APRIL',
                        sale: monthlySales[3].sale = parseInt(monthlySales[3].sale) + parseInt(ordersList[i].amount)
                    }
                }

                if (month === 5) {
                    monthlySales[4] = {
                        month: 'MAY',
                        sale: monthlySales[4].sale = parseInt(monthlySales[4].sale) + parseInt(ordersList[i].amount)
                    }
                }

                if (month === 6) {
                    monthlySales[5] = {
                        month: 'JUNE',
                        sale: monthlySales[5].sale = parseInt(monthlySales[5].sale) + parseInt(ordersList[i].amount)
                    }
                }

                if (month === 7) {
                    monthlySales[6] = {
                        month: 'JULY',
                        sale: monthlySales[6].sale = parseInt(monthlySales[6].sale) + parseInt(ordersList[i].amount)
                    }
                }

                if (month === 8) {
                    monthlySales[7] = {
                        month: 'AUG',
                        sale: monthlySales[7].sale = parseInt(monthlySales[7].sale) + parseInt(ordersList[i].amount)
                    }
                }

                if (month === 9) {
                    monthlySales[8] = {
                        month: 'SEP',
                        sale: monthlySales[8].sale = parseInt(monthlySales[8].sale) + parseInt(ordersList[i].amount)
                    }
                }

                if (month === 10) {
                    monthlySales[9] = {
                        month: 'OCT',
                        sale: monthlySales[9].sale = parseInt(monthlySales[9].sale) + parseInt(ordersList[i].amount)
                    }
                }

                if (month === 11) {
                    monthlySales[10] = {
                        month: 'NOV',
                        sale: monthlySales[10].sale = parseInt(monthlySales[10].sale) + parseInt(ordersList[i].amount)
                    }
                }

                if (month === 12) {
                    monthlySales[11] = {
                        month: 'DEC',
                        sale: monthlySales[11].sale = parseInt(monthlySales[11].sale) + parseInt(ordersList[i].amount)
                    }
                }

            }

            //  console.log(monthDtr.substr(0,2));
            // console.log(currentYear)

        }



        return res.status(200).json({
            totalSales: totalSales,
            monthlySales: monthlySales
        })

    } catch (error) {
        console.log(error);
    }
})

router.get(`/`, async (req, res) => {

    try {


        const ordersList = await Orders.find(req.query)


        if (!ordersList) {
            res.status(500).json({ success: false })
        }

        return res.status(200).json(ordersList);

    } catch (error) {
        res.status(500).json({ success: false })
    }


});


router.get('/:id', async (req, res) => {

    const order = await Orders.findById(req.params.id);

    if (!order) {
        res.status(500).json({ message: 'Không tìm thấy đơn hàng có ID đã cho.' })
    }
    return res.status(200).send(order);
})

router.get(`/get/count`, async (req, res) => {
    const orderCount = await Orders.countDocuments()

    if (!orderCount) {
        res.status(500).json({ success: false })
    } else {
        res.send({
            orderCount: orderCount
        });
    }

})


router.post('/create', async (req, res) => {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { name, phoneNumber, address, amount, paymentId, email, userid, products, date } = req.body;

            // ✅ Kiểm tra & trừ kho từng sản phẩm
            for (const item of products) {
                const updatedProduct = await Product.findOneAndUpdate(
                    {
                        _id: item.productId,
                        countInStock: { $gte: item.quantity },
                    },
                    { $inc: { countInStock: -item.quantity } },
                    { new: true, session }
                );

                if (!updatedProduct) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({
                        success: false,
                        message: `Sản phẩm "${item.productTitle}" đã hết hàng hoặc không đủ số lượng.`,
                    });
                }
            }

            // ✅ Tạo đơn hàng
            const order = new Orders({
                name,
                phoneNumber,
                address,
                amount,
                paymentId,
                email,
                userid,
                products,
                date,
            });

            const savedOrder = await order.save({ session });

            // ✅ Commit transaction
            await session.commitTransaction();
            session.endSession();

            //   ✅ Gửi email sau khi commit
            await sendEmail(
                email,
                "Xác nhận đơn hàng từ TMC Hardware",
                "Cảm ơn bạn đã mua hàng tại TMC Hardware.",
                `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f7f7f7; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background-color: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      
      <div style="background-color: #0bc2e7; color: white; text-align: center; padding: 20px;">
        <h1 style="margin: 0; font-size: 24px;">TMC Hardware</h1>
        <p style="margin: 5px 0 0; font-size: 14px;">Xác nhận đơn hàng của bạn</p>
      </div>

      <div style="padding: 25px;">
        <h2 style="color: #333;">Xin chào ${req.body.name},</h2>
        <p>Cảm ơn bạn đã mua hàng tại <strong>TMC Hardware</strong>.</p>

        <p style="font-weight: bold; margin-top: 20px;">🧾 Thông tin đơn hàng:</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th align="left" style="padding: 8px;">Sản phẩm</th>
              <th align="center" style="padding: 8px;">Số lượng</th>
              <th align="right" style="padding: 8px;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${req.body.products
                    .map(
                        (p) => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.productTitle}</td>
                  <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${p.quantity}</td>
                  <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">
                    ${(p.subTotal || p.price * p.quantity).toLocaleString("vi-VN")} ₫
                  </td>
                </tr>
              `
                    )
                    .join("")}
          </tbody>
        </table>

        <p style="font-size: 16px; font-weight: bold; text-align: right; margin-top: 15px;">
          Tổng thanh toán: 
          <span style="color: #e53935;">
            ${req.body.amount.toLocaleString("vi-VN")} ₫
          </span>
        </p>

        <div style="margin-top: 20px; background: #fafafa; padding: 15px; border-radius: 6px;">
          <p><b>Địa chỉ giao hàng:</b> ${req.body.address}</p>
          <p><b>Số điện thoại:</b> ${req.body.phoneNumber}</p>
        </div>

        <p style="margin-top: 25px;">Chúng tôi sẽ liên hệ với bạn khi đơn hàng được giao đi.</p>
        <p style="margin-bottom: 0;">Trân trọng,</p>
        <p><b>Đội ngũ TMC Hardware</b></p>

        <hr style="border: none; border-top: 1px solid #ddd; margin-top: 30px;" />

        <p style="font-size: 12px; color: #777; text-align: center;">
          Đây là email tự động, vui lòng không trả lời. 
          Nếu bạn cần hỗ trợ, hãy liên hệ qua 
          <a href="mailto:support@tmchardware.vn" style="color: #0bc2e7; text-decoration: none;">
            support@tmchardware.vn
          </a>
        </p>
      </div>
    </div>
  </div>
  `
            );

            return res.status(201).json({
                success: true,
                message: "Đặt hàng thành công!",
                order: savedOrder,
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            // ⚠️ Nếu là lỗi tạm thời (WriteConflict), thử lại
            if (error.codeName === "WriteConflict" || error.errorLabels?.includes("TransientTransactionError")) {
                retryCount++;
                console.warn(`⚠️ Gặp xung đột ghi (WriteConflict) - thử lại lần ${retryCount}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, 100 * retryCount)); // delay tăng dần
                continue;
            }

            console.error("❌ Lỗi khi tạo đơn hàng:", error);
            return res.status(500).json({
                success: false,
                message: "Không thể tạo đơn hàng.",
                error: error.message,
            });
        }
    }

    // Nếu đã thử tối đa mà vẫn lỗi
    res.status(500).json({
        success: false,
        message: "Hệ thống đang bận, vui lòng thử lại sau vài giây.",
    });
});




router.delete('/:id', async (req, res) => {

    const deletedOrder = await Orders.findByIdAndDelete(req.params.id);

    if (!deletedOrder) {
        res.status(404).json({
            message: 'Không tìm thấy đơn hàng!',
            success: false
        })
    }

    res.status(200).json({
        success: true,
        message: 'Đơn hàng đã bị xóa!'
    })
});


router.put('/:id', async (req, res) => {

    const order = await Orders.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            phoneNumber: req.body.phoneNumber,
            address: req.body.address,
            amount: req.body.amount,
            paymentId: req.body.paymentId,
            email: req.body.email,
            userid: req.body.userid,
            products: req.body.products,
            status: req.body.status
        },
        { new: true }
    )



    if (!order) {
        return res.status(500).json({
            message: 'Không thể cập nhật đơn hàng!',
            success: false
        })
    }

    res.send(order);

})



module.exports = router;

