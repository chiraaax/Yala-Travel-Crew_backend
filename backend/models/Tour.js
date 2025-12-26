const mongoose = require("mongoose");

const TourSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Cloudinary image URL
    image: {
      type: String,
      required: true,
    },

    // Cloudinary public_id (needed for delete/update)
    imagePublicId: {
      type: String,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    duration: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    maxParticipants: {
      type: Number,
      required: true,
      min: 1,
    },

    includes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("Tour", TourSchema);
