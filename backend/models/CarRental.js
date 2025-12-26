const mongoose = require("mongoose");

const CarRentalSchema = new mongoose.Schema(
  {
    vehicleName: {
      type: String,
      required: true,
      trim: true,
    },

    vehicleType: {
      type: String,
      required: true,
      trim: true,
    },

    seats: {
      type: Number,
      required: true,
      min: 1,
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
      required: true,
      trim: true,
    },

    features: {
      type: [String],
      default: [],
    },

    available: {
      type: Boolean,
      default: true,
    },

    fuel: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CarRental", CarRentalSchema);
