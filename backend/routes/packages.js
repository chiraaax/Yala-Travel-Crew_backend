const express = require("express");
const router = express.Router();
const Package = require("../models/Package");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

console.log("Packages route loaded");

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
// Helpers
// ==========================
const splitArray = (value) =>
  value ? value.split(",").map(v => v.trim()).filter(Boolean) : [];

// ==========================
// GET ALL PACKAGES
// ==========================
router.get("/", async (req, res) => {
  try {
    const packages = await Package.find();
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================
// GET SINGLE PACKAGE
// ==========================
router.get("/:id", async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================
// CREATE PACKAGE
// ==========================
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      name,
      description,
      duration,
      price,
      destinations,
      category,
      includes,
      highlights,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { folder: "packages" }
    );

    const pkg = new Package({
      name,
      image: uploadResult.secure_url,
      imagePublicId: uploadResult.public_id,
      description,
      duration,
      price: Number(price),
      destinations: splitArray(destinations),
      category,
      includes: splitArray(includes),
      highlights: splitArray(highlights),
    });

    const savedPackage = await pkg.save();
    res.status(201).json(savedPackage);

  } catch (error) {
    console.error("POST error:", error);
    res.status(400).json({ message: error.message });
  }
});

// ==========================
// UPDATE PACKAGE
// ==========================
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    let imageUrl = pkg.image;
    let imagePublicId = pkg.imagePublicId;

    // New image uploaded
    if (req.file) {
      if (imagePublicId) {
        await cloudinary.uploader.destroy(imagePublicId);
      }

      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        { folder: "packages" }
      );

      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
    }

    const updatedPkg = await Package.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name || pkg.name,
        image: imageUrl,
        imagePublicId,
        description: req.body.description || pkg.description,
        duration: req.body.duration || pkg.duration,
        price: req.body.price !== undefined ? Number(req.body.price) : pkg.price,
        destinations: req.body.destinations ? splitArray(req.body.destinations) : pkg.destinations,
        category: req.body.category || pkg.category,
        includes: req.body.includes ? splitArray(req.body.includes) : pkg.includes,
        highlights: req.body.highlights ? splitArray(req.body.highlights) : pkg.highlights,
      },
      { new: true, runValidators: true }
    );

    res.json(updatedPkg);

  } catch (error) {
    console.error("PUT error:", error);
    res.status(400).json({ message: error.message });
  }
});

// ==========================
// DELETE PACKAGE
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    if (pkg.imagePublicId) {
      await cloudinary.uploader.destroy(pkg.imagePublicId);
    }

    await Package.findByIdAndDelete(req.params.id);
    res.json({ message: "Package deleted successfully" });

  } catch (error) {
    console.error("DELETE error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
