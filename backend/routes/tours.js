const express = require("express");
const router = express.Router();
const Tour = require("../models/Tour");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

console.log("Tours route loaded");

// ==========================
// Cloudinary Config
// ==========================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==========================
// Multer (Memory Storage)
// ==========================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"), false);
  },
});

// ==========================
// Helper
// ==========================
const validateNumber = (value, fieldName) => {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new Error(`${fieldName} must be a valid positive number`);
  }
  return num;
};

// ==========================
// CREATE TOUR
// ==========================
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, description, duration, price, maxParticipants, includes } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { folder: "tours" }
    );

    const tour = new Tour({
      title,
      image: uploadResult.secure_url,
      imagePublicId: uploadResult.public_id,
      description,
      duration,
      price: validateNumber(price, "Price"),
      maxParticipants: validateNumber(maxParticipants, "Max Participants"),
      includes: includes
        ? includes.split(",").map(i => i.trim()).filter(Boolean)
        : [],
    });

    await tour.save();
    res.status(201).json(tour);

  } catch (error) {
    console.error("POST error:", error);
    res.status(400).json({ message: error.message });
  }
});

// ==========================
// GET ALL TOURS
// ==========================
router.get("/", async (req, res) => {
  try {
    const tours = await Tour.find();
    res.json(tours);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================
// GET SINGLE TOUR
// ==========================
router.get("/:id", async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ message: "Not found" });
    res.json(tour);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================
// UPDATE TOUR
// ==========================
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ message: "Not found" });

    let imageUrl = tour.image;
    let imagePublicId = tour.imagePublicId;

    // If new image uploaded
    if (req.file) {
      if (imagePublicId) {
        await cloudinary.uploader.destroy(imagePublicId);
      }

      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        { folder: "tours" }
      );

      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
    }

    const { title, description, duration, price, maxParticipants, includes } = req.body;

    const updatedTour = await Tour.findByIdAndUpdate(
      req.params.id,
      {
        title: title || tour.title,
        image: imageUrl,
        imagePublicId,
        description: description || tour.description,
        duration: duration || tour.duration,
        price: price !== undefined ? validateNumber(price, "Price") : tour.price,
        maxParticipants:
          maxParticipants !== undefined
            ? validateNumber(maxParticipants, "Max Participants")
            : tour.maxParticipants,
        includes: includes
          ? includes.split(",").map(i => i.trim()).filter(Boolean)
          : tour.includes,
      },
      { new: true, runValidators: true }
    );

    res.json(updatedTour);

  } catch (error) {
    console.error("PUT error:", error);
    res.status(400).json({ message: error.message });
  }
});

// ==========================
// DELETE TOUR
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ message: "Not found" });

    if (tour.imagePublicId) {
      await cloudinary.uploader.destroy(tour.imagePublicId);
    }

    await Tour.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });

  } catch (error) {
    console.error("DELETE error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
