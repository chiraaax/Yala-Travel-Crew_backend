const express = require("express");
const router = express.Router();
const Tour = require("../models/Tour");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

// ==========================
// Multer (Memory Storage)
// ==========================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"), false);
  },
});

// ==========================
// Helpers
// ==========================
const validateNumber = (value, field) => {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new Error(`${field} must be a valid positive number`);
  }
  return num;
};

const uploadToCloudinary = async (file, folder) => {
  return cloudinary.uploader.upload(
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
    { folder }
  );
};

// ==========================
// CREATE TOUR
// ==========================
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const uploadResult = await uploadToCloudinary(req.file, "tours");

    const tour = new Tour({
      title: req.body.title,
      image: uploadResult.secure_url,
      imagePublicId: uploadResult.public_id,
      description: req.body.description,
      duration: req.body.duration,
      price: validateNumber(req.body.price, "Price"),
      maxParticipants: validateNumber(req.body.maxParticipants, "Max Participants"),
      includes: req.body.includes
        ? req.body.includes.split(",").map(i => i.trim()).filter(Boolean)
        : [],
    });

    await tour.save();
    res.status(201).json(tour);

  } catch (error) {
    console.error("CREATE TOUR ERROR:", error);
    res.status(500).json({ message: error.message });
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
// UPDATE TOUR
// ==========================
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ message: "Not found" });

    let image = tour.image;
    let imagePublicId = tour.imagePublicId;

    if (req.file) {
      if (imagePublicId) {
        await cloudinary.uploader.destroy(imagePublicId);
      }

      const uploadResult = await uploadToCloudinary(req.file, "tours");
      image = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
    }

    const updated = await Tour.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        image,
        imagePublicId,
        price: req.body.price !== undefined
          ? validateNumber(req.body.price, "Price")
          : tour.price,
        maxParticipants: req.body.maxParticipants !== undefined
          ? validateNumber(req.body.maxParticipants, "Max Participants")
          : tour.maxParticipants,
        includes: req.body.includes
          ? req.body.includes.split(",").map(i => i.trim()).filter(Boolean)
          : tour.includes,
      },
      { new: true, runValidators: true }
    );

    res.json(updated);

  } catch (error) {
    console.error("UPDATE TOUR ERROR:", error);
    res.status(500).json({ message: error.message });
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
    console.error("DELETE TOUR ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
