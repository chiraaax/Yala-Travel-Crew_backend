const express = require("express");
const router = express.Router();
const CarRental = require("../models/CarRental");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

console.log("Rentals route loaded");

/* ======================
   Multer (Memory)
====================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  },
});

/* ======================
   Helpers
====================== */
const validateNumber = (value, fieldName) => {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new Error(`${fieldName} must be a valid positive number`);
  }
  return num;
};

const uploadToCloudinary = async (file, folder) => {
  const base64 = file.buffer.toString("base64");
  const dataURI = `data:${file.mimetype};base64,${base64}`;

  return await cloudinary.uploader.upload(dataURI, { folder });
};

/* ======================
   CREATE RENTAL
====================== */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const result = await uploadToCloudinary(req.file, "rentals");

    const rental = await CarRental.create({
      vehicleName: req.body.vehicleName,
      vehicleType: req.body.vehicleType,
      image: result.secure_url,
      imagePublicId: result.public_id,
      description: req.body.description,
      seats: validateNumber(req.body.seats, "Seats"),
      features: req.body.features
        ? req.body.features.split(",").map(f => f.trim()).filter(Boolean)
        : [],
      available: req.body.available === "true" || req.body.available === true,
      fuel: req.body.fuel,
    });

    res.status(201).json(rental);
  } catch (error) {
    console.error("CREATE rental error:", error);
    res.status(400).json({ message: error.message });
  }
});

/* ======================
   GET ALL
====================== */
router.get("/", async (req, res) => {
  try {
    const rentals = await CarRental.find();
    res.json(rentals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ======================
   UPDATE RENTAL
====================== */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const rental = await CarRental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Not found" });

    let image = rental.image;
    let imagePublicId = rental.imagePublicId;

    if (req.file) {
      if (imagePublicId) {
        await cloudinary.uploader.destroy(imagePublicId);
      }

      const result = await uploadToCloudinary(req.file, "rentals");
      image = result.secure_url;
      imagePublicId = result.public_id;
    }

    const updatedRental = await CarRental.findByIdAndUpdate(
      req.params.id,
      {
        vehicleName: req.body.vehicleName || rental.vehicleName,
        vehicleType: req.body.vehicleType || rental.vehicleType,
        image,
        imagePublicId,
        description: req.body.description || rental.description,
        seats:
          req.body.seats !== undefined
            ? validateNumber(req.body.seats, "Seats")
            : rental.seats,
        features: req.body.features
          ? req.body.features.split(",").map(f => f.trim()).filter(Boolean)
          : rental.features,
        available:
          req.body.available !== undefined
            ? req.body.available === "true" || req.body.available === true
            : rental.available,
        fuel: req.body.fuel || rental.fuel,
      },
      { new: true, runValidators: true }
    );

    res.json(updatedRental);
  } catch (error) {
    console.error("UPDATE rental error:", error);
    res.status(400).json({ message: error.message });
  }
});

/* ======================
   DELETE RENTAL
====================== */
router.delete("/:id", async (req, res) => {
  try {
    const rental = await CarRental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Not found" });

    if (rental.imagePublicId) {
      await cloudinary.uploader.destroy(rental.imagePublicId);
    }

    await rental.deleteOne();
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
