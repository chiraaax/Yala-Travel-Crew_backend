const mongoose = require("mongoose");

const PackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Cloudinary image URL
    image: {
      type: String,
      required: true,
    },

    // Cloudinary public_id (used for delete/update)
    imagePublicId: {
      type: String,
    },

    description: {
      type: String,
      trim: true,
    },

    duration: {
      type: String,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    destinations: {
      type: [String],
      default: [],
    },

    category: {
      type: String,
      trim: true,
    },

    includes: {
      type: [String],
      default: [],
    },

    highlights: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Package", PackageSchema);
