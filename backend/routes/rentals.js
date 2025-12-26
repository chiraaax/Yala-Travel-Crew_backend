const express = require("express");
const router = express.Router();
const CarRental = require("../models/CarRental");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

console.log("Rentals route loaded");

// -----------------------------
// Multer (MEMORY STORAGE)
// -----------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  },
});

// -----------------------------
// Helpers
// -----------------------------
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

  const result = await cloudinary.uploader.upload(dataURI, {
    folder,
  });

  return result.secure_url;
};

// -----------------------------
// CREATE RENTAL
// -----------------------------
router.post("/", upload.single("image"), async (req, res) => {
  try {
    console.log("POST /rentals", req.body);

    if (!req.file) {
      return res.status(400).json({ message: "Image is required!" });
    }

    const imageUrl = await uploadToCloudinary(req.file, "rentals");

    const rental = await CarRental.create({
      vehicleName: req.body.vehicleName,
      vehicleType: req.body.vehicleType,
      image: imageUrl,
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

// -----------------------------
// GET ALL RENTALS
// -----------------------------
router.get("/", async (req, res) => {
  try {
    const rentals = await CarRental.find();
    res.json(rentals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------
// GET SINGLE RENTAL
// -----------------------------
router.get("/:id", async (req, res) => {
  try {
    const rental = await CarRental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Not found" });
    res.json(rental);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -----------------------------
// UPDATE RENTAL
// -----------------------------
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const rental = await CarRental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Not found" });

    let imageUrl = rental.image;

    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file, "rentals");
    }

    const updatedRental = await CarRental.findByIdAndUpdate(
      req.params.id,
      {
        vehicleName: req.body.vehicleName || rental.vehicleName,
        vehicleType: req.body.vehicleType || rental.vehicleType,
        image: imageUrl,
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

// -----------------------------
// DELETE RENTAL
// -----------------------------
router.delete("/:id", async (req, res) => {
  try {
    const rental = await CarRental.findByIdAndDelete(req.params.id);
    if (!rental) return res.status(404).json({ message: "Not found" });

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
