const { User } = require("../models/user");
const { ImageUpload } = require("../models/imageUpload");
const { sendEmail } = require("../utils/sendEmail");

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const multer = require("multer");
const fs = require("fs");

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.cloudinary_Config_Cloud_Name,
  api_key: process.env.cloudinary_Config_api_key,
  api_secret: process.env.cloudinary_Config_api_secret,
  secure: true,
});

var imagesArr = [];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
    //imagesArr.push(`${Date.now()}_${file.originalname}`)
  },
});

const upload = multer({ storage: storage });

router.post(`/upload`, upload.array("images"), async (req, res) => {
  imagesArr = [];

  try {
    for (let i = 0; i < req?.files?.length; i++) {
      const options = {
        use_filename: true,
        unique_filename: false,
        overwrite: false,
      };

      const img = await cloudinary.uploader.upload(
        req.files[i].path,
        options,
        function (error, result) {
          imagesArr.push(result.secure_url);
          fs.unlinkSync(`uploads/${req.files[i].filename}`);
        }
      );
    }

    let imagesUploaded = new ImageUpload({
      images: imagesArr,
    });

    imagesUploaded = await imagesUploaded.save();
    return res.status(200).json(imagesArr);
  } catch (error) {
    console.log(error);
  }
});

router.post(`/signup`, async (req, res) => {
  const { name, phone, email, password, isAdmin } = req.body;

  try {
    // Generate verification code
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    let user;

    // If the user exists but is not verified, update the existing user

    const existingUser = await User.findOne({ email: email });
    const existingUserByPh = await User.findOne({ phone: phone });

    if (existingUser) {
      res.json({
        status: "FAILED",
        msg: "Email này đã tồn tại",
      });
      return;
    }

    if (existingUserByPh) {
      res.json({
        status: "FAILED",
        msg: "Só điện thoại này đã tồn tại",
      });
      return;
    }

    if (existingUser) {
      const hashPassword = await bcrypt.hash(password, 10);
      existingUser.password = hashPassword;
      existingUser.otp = verifyCode;
      existingUser.otpExpires = Date.now() + 600000; // 10 minutes
      await existingUser.save();
      user = existingUser;
    } else {
      // Create a new user
      const hashPassword = await bcrypt.hash(password, 10);

      user = new User({
        name,
        email,
        phone,
        password: hashPassword,
        isAdmin,
        otp: verifyCode,
        otpExpires: Date.now() + 600000, // 10 minutes
      });

      await user.save();
    }

    // Send verification email
    // Hàm tạo nội dung HTML OTP (chuẩn Brevo)
    // === Tạo template HTML cho email OTP ===
    const generateOtpEmailHTML = (name, otp) => `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Xác thực Email - TMC Hardware</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f7f7f7; font-family:'Segoe UI', Arial, sans-serif;">
    <div style="max-width:600px; margin:40px auto; background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background-color:#0bc2e7; color:white; text-align:center; padding:20px;">
        <h1 style="margin:0; font-size:24px;">TMC Hardware</h1>
        <p style="margin:5px 0 0; font-size:14px;">Xác thực Email của bạn</p>
      </div>

      <!-- Nội dung chính -->
      <div style="padding:25px;">
        <h2 style="color:#333;">Xin chào ${name || "bạn"},</h2>
        <p>Bạn vừa yêu cầu xác thực email tại <strong>TMC Hardware</strong>.</p>
        
        <div style="margin:25px 0; text-align:center;">
          <p style="font-size:18px; font-weight:bold; margin-bottom:10px;">Mã OTP của bạn là:</p>
          <p style="font-size:32px; font-weight:bold; color:#e53935; letter-spacing:4px; background:#f0f0f0; padding:15px 25px; border-radius:6px; display:inline-block;">
            ${otp}
          </p>
        </div>

        <p style="margin-top:20px;">Mã OTP có hiệu lực trong <strong>10 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai để đảm bảo an toàn tài khoản của bạn.</p>

        <p style="margin-top:25px;">Trân trọng,</p>
        <p><b>Đội ngũ TMC Hardware</b></p>

        <hr style="border:none; border-top:1px solid #ddd; margin-top:30px;" />

        <p style="font-size:12px; color:#777; text-align:center;">
          Đây là email tự động, vui lòng không trả lời. Nếu cần hỗ trợ, vui lòng liên hệ 
          <a href="mailto:support@tmchardware.vn" style="color:#0bc2e7; text-decoration:none;">support@tmchardware.vn</a>.
        </p>
      </div>
    </div>
  </body>
</html>
`;

    // === Gửi email xác thực OTP ===
    const resp = await sendEmailFun(
      email,                                      // địa chỉ người nhận
      "Xác thực Email - TMC Hardware",            // tiêu đề
      `Mã OTP của bạn là: ${verifyCode}`,         // nội dung dạng text fallback
      generateOtpEmailHTML(req.body.name, verifyCode) // nội dung HTML
    );


    // Create a JWT token for verification purposes
    const token = jwt.sign(
      { email: user.email, id: user._id },
      process.env.JSON_WEB_TOKEN_SECRET_KEY
    );

    return res.status(200).json({
      success: true,
      message: "Đăng ký thành công! Vui lòng xác minh email của bạn.",
      token: token, // Optional: include this if needed for verification
    });
  } catch (error) {
    console.log(error);
    res.json({ status: "FAILED", msg: "something went wrong" });
    return;
  }
});

router.post(`/verifyAccount/resendOtp`, async (req, res) => {
  const { email } = req.body;

  try {
    console.log("📩 [resendOtp] Request for:", email);

    // Kiểm tra có email hay không
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Thiếu email để gửi lại OTP.",
      });
    }

    // Tìm user
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại.",
      });
    }

    // Nếu đã verify rồi thì khỏi gửi
    if (existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản này đã được xác thực rồi.",
      });
    }

    // Tạo OTP mới
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Cập nhật lại OTP trong DB
    existingUser.otp = verifyCode;
    existingUser.otpCreatedAt = new Date();
    await existingUser.save();

    // Gửi email xác thực
    await sendEmailFun(
      email,
      "Xác thực Email - TMC Hardware",
      `Mã xác thực mới của bạn là ${verifyCode}`,
      generateOtpEmailHTML(existingUser.name || "Người dùng", verifyCode)
    );

    console.log("✅ [resendOtp] OTP resent to:", email);

    res.status(200).json({
      success: true,
      message: "Đã gửi lại OTP thành công!",
      otp: verifyCode, // nếu mày debug thì để tạm ở đây
    });
  } catch (error) {
    console.error("❌ [resendOtp] Error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi gửi lại OTP. Vui lòng thử lại sau.",
      error: error.message,
    });
  }
});

router.put(`/verifyAccount/emailVerify/:id`, async (req, res) => {
  const { email, otp } = req.body;

  try {
    const existingUser = await User.findOne({ email: email });

    console.log(existingUser);

    if (existingUser) {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        {
          name: existingUser.name,
          email: email,
          phone: existingUser.phone,
          password: existingUser.password,
          images: existingUser.images,
          isAdmin: existingUser.isAdmin,
          isVerified: existingUser.isVerified,
          otp: otp,
          otpExpires: Date.now() + 600000,
        },
        { new: true }
      );
    }


    // Send verification email
    const generateOtpEmailHTML = (name, otp) => `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Xác thực Email - TMC Hardware</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f7f7f7; font-family:'Segoe UI', Arial, sans-serif;">
    <div style="max-width:600px; margin:40px auto; background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background-color:#0bc2e7; color:white; text-align:center; padding:20px;">
        <h1 style="margin:0; font-size:24px;">TMC Hardware</h1>
        <p style="margin:5px 0 0; font-size:14px;">Xác thực Email của bạn</p>
      </div>

      <!-- Nội dung chính -->
      <div style="padding:25px;">
        <h2 style="color:#333;">Xin chào ${name || "bạn"},</h2>
        <p>Bạn vừa yêu cầu xác thực email tại <strong>TMC Hardware</strong>.</p>
        
        <div style="margin:25px 0; text-align:center;">
          <p style="font-size:18px; font-weight:bold; margin-bottom:10px;">Mã OTP của bạn là:</p>
          <p style="font-size:32px; font-weight:bold; color:#e53935; letter-spacing:4px; background:#f0f0f0; padding:15px 25px; border-radius:6px; display:inline-block;">
            ${otp}
          </p>
        </div>

        <p style="margin-top:20px;">Mã OTP có hiệu lực trong <strong>10 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai để đảm bảo an toàn tài khoản của bạn.</p>

        <p style="margin-top:25px;">Trân trọng,</p>
        <p><b>Đội ngũ TMC Hardware</b></p>

        <hr style="border:none; border-top:1px solid #ddd; margin-top:30px;" />

        <p style="font-size:12px; color:#777; text-align:center;">
          Đây là email tự động, vui lòng không trả lời. Nếu cần hỗ trợ, vui lòng liên hệ 
          <a href="mailto:support@tmchardware.vn" style="color:#0bc2e7; text-decoration:none;">support@tmchardware.vn</a>.
        </p>
      </div>
    </div>
  </body>
</html>
`;

    // === Gửi email xác thực OTP ===
    const resp = await sendEmailFun(
      email,                                      // địa chỉ người nhận
      "Xác thực Email - TMC Hardware",            // tiêu đề
      `Mã OTP của bạn là: ${verifyCode}`,         // nội dung dạng text fallback
      generateOtpEmailHTML(req.body.name, verifyCode) // nội dung HTML
    );



    // Create a JWT token for verification purposes
    const token = jwt.sign(
      { email: existingUser.email, id: existingUser._id },
      process.env.JSON_WEB_TOKEN_SECRET_KEY
    );

    // Send success response
    return res.status(200).json({
      success: true,
      message: "OTP",
      token: token, // Optional: include this if needed for verification
    });
  } catch (error) {
    console.log(error);
    res.json({ status: "FAILED", msg: "something went wrong" });
    return;
  }
});

const sendEmailFun = async (to, subject, text, html) => {
  const result = await sendEmail(to, subject, text, html);
  if (result.success) {
    return true;
    //res.status(200).json({ message: 'Email sent successfully', messageId: result.messageId });
  } else {
    return false;
    // res.status(500).json({ message: 'Failed to send email', error: result.error });
  }
};

router.post("/verifyemail", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Không tìm thấy người dùng" });
    }

    const isCodeValid = user.otp === otp;
    const isNotExpired = user.otpExpires > Date.now();

    if (isCodeValid && isNotExpired) {
      user.isVerified = true;
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return res
        .status(200)
        .json({ success: true, message: "Xác thực OTP thành công" });
    } else if (!isCodeValid) {
      return res.status(400).json({ success: false, message: "OTP không hợp lệ" });
    } else {
      return res.status(400).json({ success: false, message: "OTP đã hết hạn" });
    }
  } catch (err) {
    console.log("Error in verifyEmail", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi khi xác minh email" });
  }
});

router.post(`/signin`, async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email: email });
    if (!existingUser) {
      res.status(404).json({ error: true, msg: "Không tìm thấy người dùng!" });
      return;
    }

    if (existingUser.isVerified === false) {
      res.json({
        error: true,
        isVerify: false,
        msg: "Tài khoản của bạn chưa hoạt động, vui lòng xác minh tài khoản của bạn trước hoặc Đăng ký với người dùng mới",
      });
      return;
    }

    const matchPassword = await bcrypt.compare(password, existingUser.password);

    if (!matchPassword) {
      return res.status(400).json({ error: true, msg: "Thông tin đăng nhập không hợp lệ" });
    }

    const token = jwt.sign(
      { email: existingUser.email, id: existingUser._id },
      process.env.JSON_WEB_TOKEN_SECRET_KEY
    );

    return res.status(200).send({
      user: existingUser,
      token: token,
      msg: "Xác thực thành công",
    });
  } catch (error) {
    res.status(500).json({ error: true, msg: "something went wrong" });
    return;
  }
});

router.put("/changePassword/:id", async (req, res) => {
  try {
    const { name, phone, email, password, newPass, images } = req.body;

    // 1️⃣ Kiểm tra người dùng tồn tại
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res
        .status(404)
        .json({ error: true, msg: "Không tìm thấy người dùng!" });
    }

    // 2️⃣ So sánh mật khẩu hiện tại
    const matchPassword = await bcrypt.compare(password, existingUser.password);
    if (!matchPassword) {
      return res
        .status(400)
        .json({ error: true, msg: "Mật khẩu hiện tại không đúng!" });
    }

    // 3️⃣ Hash mật khẩu mới (nếu có)
    let newPassword = existingUser.password;
    if (newPass && newPass.trim() !== "") {
      newPassword = await bcrypt.hash(newPass, 10);
    }

    // 4️⃣ Cập nhật thông tin người dùng
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        phone,
        email,
        password: newPassword,
        images,
      },
      { new: true }
    );

    if (!updatedUser) {
      return res
        .status(400)
        .json({ error: true, msg: "Không thể cập nhật người dùng!" });
    }

    // 5️⃣ Trả phản hồi thành công
    return res.status(200).json({
      success: true,
      msg: "Đổi mật khẩu thành công!",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Lỗi khi đổi mật khẩu:", error);
    res.status(500).json({ error: true, msg: "Lỗi máy chủ!" });
  }
});


router.get(`/`, async (req, res) => {
  const userList = await User.find();

  if (!userList) {
    res.status(500).json({ success: false });
  }
  res.send(userList);
});

router.get("/:id", async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res
      .status(500)
      .json({ message: "Không tìm thấy người dùng có ID đã cho." });
  } else {
    res.status(200).send(user);
  }
});

router.delete("/:id", (req, res) => {
  User.findByIdAndDelete(req.params.id)
    .then((user) => {
      if (user) {
        return res
          .status(200)
          .json({ success: true, message: "người dùng đã bị xóa!  " });
      } else {
        return res
          .status(404)
          .json({ success: false, message: " không tìm thấy người dùng!" });
      }
    })
    .catch((err) => {
      return res.status(500).json({ success: false, error: err });
    });
});

router.get(`/get/count`, async (req, res) => {
  const userCount = await User.countDocuments();

  if (!userCount) {
    res.status(500).json({ success: false });
  }
  res.send({
    userCount: userCount,
  });
});

router.post(`/authWithGoogle`, async (req, res) => {
  const { name, phone, email, password, images, isAdmin } = req.body;

  try {
    const existingUser = await User.findOne({ email: email });

    if (!existingUser) {
      const result = await User.create({
        name: name,
        phone: phone,
        email: email,
        password: password,
        images: images,
        isAdmin: isAdmin,
        isVerified: true,
      });

      const token = jwt.sign(
        { email: result.email, id: result._id },
        process.env.JSON_WEB_TOKEN_SECRET_KEY
      );

      return res.status(200).send({
        user: result,
        token: token,
        msg: "Đăng Nhập Thành Công !",
      });
    } else {
      const existingUser = await User.findOne({ email: email });
      const token = jwt.sign(
        { email: existingUser.email, id: existingUser._id },
        process.env.JSON_WEB_TOKEN_SECRET_KEY
      );

      return res.status(200).send({
        user: existingUser,
        token: token,
        msg: "Đăng Nhập Thành Công !",
      });
    }
  } catch (error) {
    console.log(error);
  }
});

router.put("/:id", async (req, res) => {
  const { name, phone, email } = req.body;

  const userExist = await User.findById(req.params.id);

  if (req.body.password) {
    newPassword = bcrypt.hashSync(req.body.password, 10);
  } else {
    newPassword = userExist.passwordHash;
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      name: name,
      phone: phone,
      email: email,
      password: newPassword,
      images: imagesArr,
    },
    { new: true }
  );

  if (!user) return res.status(400).send("the user cannot be Updated!");

  res.send(user);
});

router.delete("/deleteImage", async (req, res) => {
  const imgUrl = req.query.img;

  // console.log(imgUrl)

  const urlArr = imgUrl.split("/");
  const image = urlArr[urlArr.length - 1];

  const imageName = image.split(".")[0];

  const response = await cloudinary.uploader.destroy(
    imageName,
    (error, result) => {
      // console.log(error, res)
    }
  );

  if (response) {
    res.status(200).send(response);
  }
});

router.post(`/forgotPassword`, async (req, res) => {
  const { email } = req.body;

  try {
    // Generate verification code
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    // If the user exists but is not verified, update the existing user

    const existingUser = await User.findOne({ email: email });

    if (!existingUser) {
      res.json({ status: "FAILED", msg: "Người dùng không tồn tại với email này!" });
      return;
    }

    if (existingUser) {
      existingUser.otp = verifyCode;
      existingUser.otpExpires = Date.now() + 600000; // 10 minutes
      await existingUser.save();
    }

    // Send verification email
    const generateOtpEmailHTML = (name, otp) => `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Xác thực Email - TMC Hardware</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f7f7f7; font-family:'Segoe UI', Arial, sans-serif;">
    <div style="max-width:600px; margin:40px auto; background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background-color:#0bc2e7; color:white; text-align:center; padding:20px;">
        <h1 style="margin:0; font-size:24px;">TMC Hardware</h1>
        <p style="margin:5px 0 0; font-size:14px;">Xác thực Email của bạn</p>
      </div>

      <!-- Nội dung chính -->
      <div style="padding:25px;">
        <h2 style="color:#333;">Xin chào ${name || "bạn"},</h2>
        <p>Bạn vừa yêu cầu xác thực email tại <strong>TMC Hardware</strong>.</p>
        
        <div style="margin:25px 0; text-align:center;">
          <p style="font-size:18px; font-weight:bold; margin-bottom:10px;">Mã OTP của bạn là:</p>
          <p style="font-size:32px; font-weight:bold; color:#e53935; letter-spacing:4px; background:#f0f0f0; padding:15px 25px; border-radius:6px; display:inline-block;">
            ${otp}
          </p>
        </div>

        <p style="margin-top:20px;">Mã OTP có hiệu lực trong <strong>10 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai để đảm bảo an toàn tài khoản của bạn.</p>

        <p style="margin-top:25px;">Trân trọng,</p>
        <p><b>Đội ngũ TMC Hardware</b></p>

        <hr style="border:none; border-top:1px solid #ddd; margin-top:30px;" />

        <p style="font-size:12px; color:#777; text-align:center;">
          Đây là email tự động, vui lòng không trả lời. Nếu cần hỗ trợ, vui lòng liên hệ 
          <a href="mailto:support@tmchardware.vn" style="color:#0bc2e7; text-decoration:none;">support@tmchardware.vn</a>.
        </p>
      </div>
    </div>
  </body>
</html>
`;

    // === Gửi email xác thực OTP ===
    const resp = await sendEmailFun(
      email,                                      // địa chỉ người nhận
      "Xác thực Email - TMC Hardware",            // tiêu đề
      `Mã OTP của bạn là: ${verifyCode}`,         // nội dung dạng text fallback
      generateOtpEmailHTML(req.body.name, verifyCode) // nội dung HTML
    );


    // Send success response
    return res.status(200).json({
      success: true,
      status: "SUCCESS",
      message: "OTP",
    });
  } catch (error) {
    console.log(error);
    res.json({ status: "FAILED", msg: "something went wrong" });
    return;
  }
});


router.post(`/forgotPassword/changePassword`, async (req, res) => {
  const { email, newPass } = req.body;

  try {

    const existingUser = await User.findOne({ email: email });

    if (existingUser) {
      const hashPassword = await bcrypt.hash(newPass, 10);
      existingUser.password = hashPassword;
      await existingUser.save();
    }


    // Send success response
    return res.status(200).json({
      success: true,
      status: "SUCCESS",
      message: "Đã thay đổi mật khẩu thành công",
    });
  } catch (error) {
    console.log(error);
    res.json({ status: "FAILED", msg: "something went wrong" });
    return;
  }
});

module.exports = router;
