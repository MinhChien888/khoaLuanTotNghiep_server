const express = require("express");
const router = express.Router();
const { Address } = require("../models/address");

/**
 * GET - Lấy tất cả địa chỉ theo user
 * /api/addresses?userId=xxx
 */
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu userId",
      });
    }

    const addresses = await Address.find({ userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.json(addresses);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST - Thêm địa chỉ mới
 * /api/addresses
 */
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      fullName,
      phoneNumber,
      email,
      addressLine1,
      addressLine2,
      isDefault,
    } = req.body;

    if (
      !userId ||
      !fullName ||
      !phoneNumber ||
      !email ||
      !addressLine1 ||
      !addressLine2
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin giao hàng",
      });
    }

    // Nếu set mặc định → bỏ default cũ
    if (isDefault) {
      await Address.updateMany(
        { userId },
        { isDefault: false }
      );
    }

    const address = new Address({
      userId,
      fullName,
      phoneNumber,
      email,
      addressLine1,
      addressLine2,
      isDefault: isDefault || false,
    });

    await address.save();

    res.status(201).json({
      success: true,
      message: "Thêm địa chỉ thành công",
      address,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT - Cập nhật địa chỉ
 * /api/addresses/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const addressId = req.params.id;
    const updateData = req.body;

    if (updateData.isDefault) {
      const address = await Address.findById(addressId);
      if (address) {
        await Address.updateMany(
          { userId: address.userId },
          { isDefault: false }
        );
      }
    }

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      message: "Cập nhật địa chỉ thành công",
      address: updatedAddress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT - Set địa chỉ mặc định
 * /api/addresses/set-default/:id
 */
router.put("/set-default/:id", async (req, res) => {
  try {
    const addressId = req.params.id;

    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy địa chỉ",
      });
    }

    await Address.updateMany(
      { userId: address.userId },
      { isDefault: false }
    );

    address.isDefault = true;
    await address.save();

    res.json({
      success: true,
      message: "Đã đặt làm địa chỉ mặc định",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE - Xóa địa chỉ
 * /api/addresses/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    await Address.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Xóa địa chỉ thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
