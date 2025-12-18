const mongoose = require("mongoose");

const addressSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
    },

    addressLine1: {
      type: String,
      required: true, // Xã/Phường, Tỉnh
    },

    addressLine2: {
      type: String,
      required: true, // Số nhà, ấp, thôn...
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* Virtual id */
addressSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

addressSchema.set("toJSON", {
  virtuals: true,
});

exports.Address = mongoose.model("Address", addressSchema);
exports.addressSchema = addressSchema;
